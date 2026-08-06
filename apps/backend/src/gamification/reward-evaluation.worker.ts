import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { Prisma } from '../generated/prisma/client';
import type {
  XpLedgerEntry,
  LevelDefinition,
  RewardGrantComponent,
  RewardBundle,
  RewardBundleItem,
  RewardSourceEntityType,
  AchievementDefinition,
  AchievementVersion,
  AchievementUnlock,
  ChallengeDefinition,
} from '../generated/prisma/client';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { XpBalanceRepository } from './xp-balance.repository';
import { RewardEvaluationCursorRepository } from './reward-evaluation-cursor.repository';
import { ProgressionService } from './progression.service';
import { LevelDefinitionRepository } from './level-definition.repository';
import { RewardBundleRepository } from './reward-bundle.repository';
import { RewardGrantRepository, type RewardGrantWithComponents } from './reward-grant.repository';
import { RewardGrantComponentRepository } from './reward-grant-component.repository';
import { AchievementDefinitionRepository } from './achievement-definition.repository';
import { AchievementVersionRepository } from './achievement-version.repository';
import { AchievementProgressRepository } from './achievement-progress.repository';
import { AchievementUnlockRepository } from './achievement-unlock.repository';
import { parseUnlockRule, type XpThresholdUnlockRule } from './achievement-unlock-rule';
import { AccountTitleRepository } from './account-title.repository';
import { InventoryItemRepository } from './inventory-item.repository';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { AccountChallengeRepository } from './account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from './account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from './account-challenge-consumed-event.repository';
import { parseCompletionRule, parseEligibilityRule } from './challenge-rule';
import { utcDayStart } from './daily-activity-signal.reader';

/**
 * Bloque III (ADR-0019). Sub-incremento 1.b: descubrimiento de cuentas
 * pendientes, exclusión mutua por cuenta, aislamiento de fallo, backoff --
 * `discoverPendingAccounts`/`processAccount`/`run` no se tocaron desde
 * entonces, tal como preveía su diseño original.
 *
 * Sub-incremento 1.c llena `evaluateAccount()` (antes un punto de
 * extensión vacío) ÚNICAMENTE para la fuente `LEVEL` y el componente
 * `XP_BONUS` -- primer camino real de entrega, demuestra la convergencia
 * del ciclo XP -> reward_grant -> XP_BONUS -> nuevo XP -> reevaluación.
 *
 * Sub-incremento 2.b (Incremento 2, Logros) añade la fuente
 * `ACHIEVEMENT_UNLOCK`, SOLO para `achievement_definition.repeatability =
 * UNIQUE` (`REPEATABLE` queda fuera -- el reinicio de progreso tras
 * desbloquear no está definido por ningún documento). Precisión
 * obligatoria del Product Owner: completar el umbral
 * (`achievement_progress` IN_PROGRESS -> COMPLETED) y crear el
 * `achievement_unlock` correspondiente son una ÚNICA transacción atómica
 * -- nunca puede existir una fila `COMPLETED` sin su unlock, porque un
 * reintento posterior la omitiría permanentemente (ninguna otra fuente de
 * este worker vuelve a mirar una fila ya completada). La entrega del
 * `reward_grant`/sus componentes SÍ sigue siendo recuperable por separado
 * (mismo mecanismo de dos capas que `LEVEL`) -- `repairAchievementRewardChain`
 * repara la cadena si el grant falta o quedan componentes `XP_BONUS` sin
 * entregar, tanto justo después de completar como en cualquier reintento
 * posterior sobre una fila ya `COMPLETED`.
 *
 * Sub-incremento 4.b (Incremento 4, Desafíos) añade `evaluateChallenges`,
 * consumiendo ÚNICAMENTE `pendingEntries` (mismo dato ya recibido, sin
 * ensanchar la frontera del worker) filtrado a `entryType = OTORGAMIENTO`.
 * Por cada evento y cada `challenge_definition` ACTIVA cuya ventana lo
 * contiene: deduplicación por evento (`account_challenge_consumed_event`),
 * tope diario real (`account_challenge_daily_progress`, día calendario
 * UTC -- §4.16(a)) e incremento de `progressValue`, todo en una única
 * transacción `SERIALIZABLE` por `(evento, account_challenge)` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.16. Transiciona ÚNICAMENTE
 * `ACCEPTED -> IN_PROGRESS -> COMPLETED`; `CLAIMED` queda fuera de 4.b.
 * Cosméticos (Incremento 5) siguen sin evaluación real -- este worker
 * todavía NO escribe sobre inventario cosmético ni `public_profile`.
 *
 * Namespace de advisory lock (`ADVISORY_LOCK_NAMESPACE = 19`, por
 * ADR-0019): primer uso de advisory locks en el proyecto -- namespace fijo
 * para evitar colisión con cualquier uso futuro de otro subsistema.
 */
const ADVISORY_LOCK_NAMESPACE = 19;

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Mismo criterio que XpGrantService.isUniqueConstraintViolation -- duplicado a propósito, no importado (función privada de un módulo que ADR-0019 no modifica). */
function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

/** Mismo criterio de backoff acotado y creciente que NO_RULE_BACKOFF_MS (XpGrantService, Bloque I) -- valores reutilizados, no importados (esa constante es privada de ese módulo, que ADR-0019 no modifica). */
const FAILURE_BACKOFF_MS = [
  60_000, // 1 min
  5 * 60_000, // 5 min
  30 * 60_000, // 30 min
  2 * 60 * 60_000, // 2 h
  6 * 60 * 60_000, // 6 h
  24 * 60 * 60_000, // 24 h (tope)
];

function backoffFor(attemptsSoFar: number): number {
  const index = Math.min(attemptsSoFar, FAILURE_BACKOFF_MS.length - 1);
  return FAILURE_BACKOFF_MS[index] ?? FAILURE_BACKOFF_MS[FAILURE_BACKOFF_MS.length - 1]!;
}

export type ProcessAccountOutcome = 'PROCESSED' | 'SKIPPED_LOCKED' | 'FAILED';

@Injectable()
export class RewardEvaluationWorker {
  private readonly logger = new Logger(RewardEvaluationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepo: XpLedgerEntryRepository,
    private readonly cursorRepo: RewardEvaluationCursorRepository,
    private readonly balanceRepo: XpBalanceRepository,
    private readonly progressionService: ProgressionService,
    private readonly levelDefinitionRepo: LevelDefinitionRepository,
    private readonly bundleRepo: RewardBundleRepository,
    private readonly grantRepo: RewardGrantRepository,
    private readonly componentRepo: RewardGrantComponentRepository,
    private readonly txRunner: TransactionRunnerService,
    private readonly achievementDefinitionRepo: AchievementDefinitionRepository,
    private readonly achievementVersionRepo: AchievementVersionRepository,
    private readonly achievementProgressRepo: AchievementProgressRepository,
    private readonly achievementUnlockRepo: AchievementUnlockRepository,
    private readonly accountTitleRepo: AccountTitleRepository,
    private readonly inventoryItemRepo: InventoryItemRepository,
    private readonly challengeDefinitionRepo: ChallengeDefinitionRepository,
    private readonly accountChallengeRepo: AccountChallengeRepository,
    private readonly dailyProgressRepo: AccountChallengeDailyProgressRepository,
    private readonly consumedEventRepo: AccountChallengeConsumedEventRepository,
  ) {}

  /**
   * Sub-incremento 1.c (ADR-0019, BLOCK-III-DEFINITION.md §4.1) -- primer
   * camino real de entrega, ÚNICAMENTE fuente `LEVEL` y componente
   * `XP_BONUS`. Logros/desafíos (Incrementos 2/4) y títulos/cosméticos
   * (Incrementos 3/5) siguen fuera de alcance -- este método no los toca.
   *
   * Recompute desde el origen (ADR-0019 §2): reutiliza
   * `ProgressionService.getLevelProgress` (Bloque II, sin modificar) para
   * el nivel actual -- no acumula sobre `pendingEntries`, por lo que
   * ejecutar dos veces sobre el mismo estado no escribe nada distinto
   * (Gate 27, idempotencia de lote).
   *
   * `pendingEntries`/`_tx` (el advisory lock de la cuenta) no participan en
   * la entrega en sí: `RewardGrantRepository`/`XpLedgerEntryRepository`
   * gestionan sus propias transacciones internas, cada una idempotente por
   * su propia clave -- mismo patrón de "dos capas" que XpGrantService
   * (ADR-0019 §3). Si algún componente XP_BONUS queda sin poder entregarse,
   * este método LANZA -- processAccount no avanza el cursor, así que la
   * cuenta vuelve a aparecer como pendiente (mismas pendingEntries) en la
   * siguiente corrida, sin depender de que llegue XP nuevo.
   */
  protected async evaluateAccount(_tx: Prisma.TransactionClient, accountId: string, pendingEntries: XpLedgerEntry[]): Promise<void> {
    const [progress, levels] = await Promise.all([
      this.progressionService.getLevelProgress(accountId),
      this.levelDefinitionRepo.findAllActiveOrderedByLevelNumber(),
    ]);
    const lastActivityId = pendingEntries[pendingEntries.length - 1]!.id;

    const eligibleLevels = levels.filter(
      (level): level is LevelDefinition & { rewardBundleId: string } =>
        level.rewardBundleId != null && level.levelNumber <= progress.currentLevel.levelNumber,
    );

    let hasUnresolvedComponent = false;
    for (const level of eligibleLevels) {
      const resolved = await this.grantLevelReward(accountId, level);
      if (!resolved) hasUnresolvedComponent = true;
    }

    const achievementsResolved = await this.evaluateAchievements(accountId, progress.lifetimeXp, lastActivityId);
    if (!achievementsResolved) hasUnresolvedComponent = true;

    const challengesResolved = await this.evaluateChallenges(accountId, pendingEntries);
    if (!challengesResolved) hasUnresolvedComponent = true;

    if (hasUnresolvedComponent) {
      throw new Error(`No se pudieron resolver todas las recompensas pendientes (nivel y/o logros) para la cuenta ${accountId}.`);
    }
  }

  /**
   * Entrega (o recupera, si ya existía) la recompensa de UN nivel para la
   * cuenta -- idempotente por `reward:LEVEL:{accountId}:{levelNumber}`
   * (§4.4). Devuelve `false` si algún componente `XP_BONUS` quedó sin
   * `DELIVERED` -- ver `deliverBundleComponents`.
   */
  private async grantLevelReward(accountId: string, level: LevelDefinition & { rewardBundleId: string }): Promise<boolean> {
    const bundle = await this.bundleRepo.findById(level.rewardBundleId);
    if (!bundle) {
      this.logger.error(`LevelDefinition (nivel ${level.levelNumber}) referencia un reward_bundle_id inexistente (${level.rewardBundleId}).`);
      return false;
    }
    const sourceEntityId = `${accountId}:${level.levelNumber}`;
    const { allResolved } = await this.deliverBundleComponents(accountId, bundle, 'LEVEL', sourceEntityId);
    return allResolved;
  }

  /**
   * Crea (idempotentemente) el `reward_grant` de un bundle para CUALQUIER
   * fuente (`LEVEL`/`ACHIEVEMENT_UNLOCK`) y entrega sus componentes
   * `XP_BONUS`/`TITLE` -- único camino de entrega, compartido, mismo
   * criterio "reutilizar el mecanismo genérico" que ADR-0019 exige.
   * `COSMETIC` en el mismo bundle queda `PENDING`, a la espera del
   * Incremento 5 -- no cuenta como fallo. `idempotencyKey =
   * reward:{sourceEntityType}:{sourceEntityId}` (§4.4).
   *
   * Visibilidad ampliada a pública en 4.c -- reutilizado por
   * `ChallengeService.claim` (§4.17) para la fuente `CHALLENGE_CLAIM`, sin
   * camino de entrega paralelo (mismo criterio "reutilizar el mecanismo
   * genérico" que ADR-0019 exige). Sigue sin transicionar nada de
   * `account_challenge` -- eso es responsabilidad exclusiva de
   * `ChallengeService`/`AccountChallengeRepository`.
   */
  async deliverBundleComponents(
    accountId: string,
    bundle: RewardBundle & { items: RewardBundleItem[] },
    sourceEntityType: RewardSourceEntityType,
    sourceEntityId: string,
  ) {
    // Guarda de última línea (defensa en profundidad): un accountId ausente
    // aquí nunca debería originarse en el propio worker (siempre recibe el
    // parámetro real de processAccount/discoverPendingAccounts) -- pero un
    // llamador externo con un valor corrupto (visto en gates: una sesión de
    // prueba fallida silenciosamente propagada) NO debe poder persistir un
    // reward_grant con sourceEntityId literal "undefined:..." -- falla
    // rápido y explícito en vez de escribir un dato irrecuperable.
    if (!accountId) {
      throw new Error(`deliverBundleComponents: accountId ausente (sourceEntityType=${sourceEntityType}, sourceEntityId=${sourceEntityId}).`);
    }
    const { grant } = await this.grantRepo.createIdempotent({
      accountId,
      rewardBundleId: bundle.id,
      sourceEntityType,
      sourceEntityId,
      idempotencyKey: `reward:${sourceEntityType}:${sourceEntityId}`,
      components: bundle.items.map((item) => ({
        componentType: item.componentType,
        xpAmount: item.xpAmount,
        referenceId: item.referenceId,
      })),
    });

    let allResolved = true;
    for (const component of grant.components) {
      if (component.deliveryStatus === 'DELIVERED') continue;
      if (component.componentType === 'XP_BONUS') {
        const delivered = await this.deliverXpBonusComponent(accountId, component);
        if (!delivered) allResolved = false;
      } else if (component.componentType === 'TITLE') {
        const delivered = await this.deliverTitleComponent(accountId, grant, component);
        if (!delivered) allResolved = false;
      } else if (component.componentType === 'COSMETIC') {
        const delivered = await this.deliverCosmeticComponent(accountId, grant, component);
        if (!delivered) allResolved = false;
      }
    }
    return { grant, allResolved };
  }

  /**
   * Entrega real de UN componente `TITLE`: crea `account_title`
   * idempotentemente (por `UNIQUE(accountId, titleDefinitionId)`) --
   * `component.referenceId` ya está garantizado por el trigger de base de
   * datos (`enforce_reward_grant_component_title_reference`, 3.a) a
   * existir en `title_definition`, así que este método no necesita
   * validarlo de nuevo. `acquisitionSourceType`/`acquisitionSourceId` son
   * snapshot de la cabecera `grant` que entrega este componente -- fuente
   * autoritativa de adquisición (nunca `TitleDefinition.unlockSourceType`,
   * solo metadato descriptivo). Operación de PROPIEDAD únicamente -- nunca
   * equipa (`equipped_title` pertenece a 3.b, fuera de alcance aquí).
   */
  private async deliverTitleComponent(accountId: string, grant: RewardGrantWithComponents, component: RewardGrantComponent): Promise<boolean> {
    try {
      await this.accountTitleRepo.createIdempotent({
        accountId,
        titleDefinitionId: component.referenceId!,
        acquisitionSourceType: grant.sourceEntityType,
        acquisitionSourceId: grant.sourceEntityId,
        acquiredAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo entregando componente TITLE ${component.id} (cuenta ${accountId}): ${message}`);
      await this.componentRepo.markFailed(component.id);
      return false;
    }
    await this.componentRepo.markDelivered(component.id);
    return true;
  }

  /**
   * Entrega real de UN componente `COSMETIC` (Incremento 5, sub-incremento
   * 5.a, §4.19): crea `inventory_item` idempotentemente (por
   * `UNIQUE(accountId, cosmeticItemId)`) -- mismo mecanismo exacto que
   * `deliverTitleComponent` (`component.referenceId` ya garantizado por
   * `enforce_reward_grant_component_cosmetic_reference` a existir en
   * `cosmetic_item`). `acquisitionSourceType`/`acquisitionSourceId` son
   * snapshot de la cabecera `grant` -- fuente autoritativa de adquisición.
   *
   * Si ya existe un `inventory_item` con `ownershipStatus` distinto de
   * `ACTIVE` (`REVOKED`/`SUPERSEDED`), `createIdempotent` lo devuelve tal
   * cual, sin reactivarlo (§4.19) -- este método lo trata igual que
   * cualquier otra recuperación idempotente: entrega resuelta,
   * `markDelivered`, sin error. Operación de PROPIEDAD únicamente -- nunca
   * equipa (`equipped_cosmetic` pertenece a 5.b, fuera de alcance aquí).
   */
  private async deliverCosmeticComponent(accountId: string, grant: RewardGrantWithComponents, component: RewardGrantComponent): Promise<boolean> {
    try {
      await this.inventoryItemRepo.createIdempotent({
        accountId,
        cosmeticItemId: component.referenceId!,
        acquisitionSourceType: grant.sourceEntityType,
        acquisitionSourceId: grant.sourceEntityId,
        acquiredAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo entregando componente COSMETIC ${component.id} (cuenta ${accountId}): ${message}`);
      await this.componentRepo.markFailed(component.id);
      return false;
    }
    await this.componentRepo.markDelivered(component.id);
    return true;
  }

  /**
   * Entrega real de UN componente `XP_BONUS`: `xp_ledger_entry` (entryType
   * `BONO`) + `xp_balance.upsertIncrement`, en la MISMA transacción
   * SERIALIZABLE -- mismo patrón exacto que `XpGrantService.grantForActivity`
   * (Bloque I), reutilizando los repositorios ya existentes, sin camino de
   * escritura paralelo (ADR-0019 §5/§6). `idempotencyKey = bono:{componentId}`
   * -- estable, uno por componente, nunca colisiona entre cuentas ni niveles.
   *
   * La nueva `xp_ledger_entry` queda por encima del `pendingEntries` que
   * disparó esta pasada -- el cursor no avanza hasta ahí (avanza solo a la
   * última entrada YA leída), así que dispara una evaluación siguiente por
   * sí sola. Converge por construcción (ADR-0019 §2): el catálogo de
   * niveles es finito y cada nivel solo se otorga una vez.
   */
  private async deliverXpBonusComponent(accountId: string, component: RewardGrantComponent): Promise<boolean> {
    const idempotencyKey = `bono:${component.id}`;
    try {
      await this.txRunner.run(
        async (tx) => {
          const { entry } = await this.ledgerRepo.createIdempotent(
            {
              accountId,
              entryType: 'BONO',
              xpAmount: component.xpAmount!,
              reasonCode: 'REWARD_GRANT_LEVEL',
              idempotencyKey,
              occurredAt: new Date(),
            },
            tx,
          );
          await this.balanceRepo.upsertIncrement(tx, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Fallo entregando componente XP_BONUS ${component.id} (cuenta ${accountId}): ${message}`);
        await this.componentRepo.markFailed(component.id);
        return false;
      }
      // P2002 dentro de la transacción: la xp_ledger_entry ya existía de un
      // intento anterior (creada, pero markDelivered no llegó a ejecutarse
      // antes de un fallo) -- se recupera como entregada, SIN volver a
      // incrementar xp_balance (ya se incrementó la primera vez).
    }
    await this.componentRepo.markDelivered(component.id);
    return true;
  }

  /**
   * Evalúa todos los logros `repeatability = UNIQUE` -- `REPEATABLE` queda
   * explícitamente fuera de 2.b (el reinicio de progreso tras desbloquear
   * no está definido por ningún documento, vacío para un incremento
   * futuro). Un fallo en UN logro no impide evaluar los demás.
   */
  private async evaluateAchievements(accountId: string, lifetimeXp: number, lastActivityId: string): Promise<boolean> {
    const definitions = await this.achievementDefinitionRepo.findAllActiveOrderedByKey();
    let allResolved = true;
    for (const definition of definitions) {
      if (definition.repeatability !== 'UNIQUE') continue;
      const resolved = await this.evaluateAchievementDefinition(accountId, definition, lifetimeXp, lastActivityId);
      if (!resolved) allResolved = false;
    }
    return allResolved;
  }

  /**
   * Recompute puro (ADR-0019 §2) sobre UN logro para la cuenta. Si no
   * existe `achievement_progress`, la fija a la versión `APPROVED` vigente
   * AHORA (§4.4/ADR-0019 §4) -- esa versión ya no vuelve a re-resolverse
   * para esta fila; toda recomputación posterior lee `unlockRule` de la
   * MISMA versión guardada en la fila, nunca de una versión más nueva.
   *
   * Precisión obligatoria del Product Owner: completar el umbral
   * (`IN_PROGRESS -> COMPLETED`) y crear el `achievement_unlock` ocurren
   * en UNA sola transacción (`txRunner.run`) -- si la creación del unlock
   * falla, TODA la transacción revierte (incluida la marca de completado),
   * así que nunca queda una fila `COMPLETED` sin su unlock. La entrega del
   * `reward_grant`/sus componentes es un paso posterior, recuperable por
   * separado vía `repairAchievementRewardChain`.
   */
  private async evaluateAchievementDefinition(
    accountId: string,
    definition: AchievementDefinition,
    lifetimeXp: number,
    lastActivityId: string,
  ): Promise<boolean> {
    let progressRow = await this.achievementProgressRepo.findByAccountAndDefinition(accountId, definition.id);
    let version: AchievementVersion | null;

    if (!progressRow) {
      version = await this.achievementVersionRepo.findApprovedEffectiveAt(definition.id, new Date());
      if (!version) return true; // sin versión APPROVED configurada todavía -- no es un fallo, nada que trackear aún
      const rule = this.parseRuleOrNull(version, definition);
      if (!rule) return false;
      const { progress } = await this.achievementProgressRepo.createIdempotent({
        accountId,
        achievementDefinitionId: definition.id,
        achievementVersionId: version.id,
        currentValue: lifetimeXp,
        targetValue: rule.value,
        lastActivityId,
      });
      progressRow = progress;
    } else {
      version = await this.achievementVersionRepo.findById(progressRow.achievementVersionId);
      if (!version) {
        this.logger.error(`achievement_progress ${progressRow.id} referencia un achievement_version_id inexistente (${progressRow.achievementVersionId}).`);
        return false;
      }
    }

    if (progressRow.progressStatus === 'COMPLETED') {
      return this.repairAchievementRewardChain(accountId, definition, version, null);
    }

    const rule = this.parseRuleOrNull(version, definition);
    if (!rule) return false;

    if (lifetimeXp < rule.value) {
      if (lifetimeXp !== progressRow.currentValue) {
        await this.achievementProgressRepo.updateCurrentValue(progressRow.id, lifetimeXp, lastActivityId);
      }
      return true;
    }

    let unlock: AchievementUnlock;
    try {
      unlock = await this.txRunner.run(async (tx) => {
        await this.achievementProgressRepo.markCompleted(tx, progressRow!.id, lifetimeXp, lastActivityId);
        return this.achievementUnlockRepo.createIdempotent(tx, {
          accountId,
          achievementDefinitionId: definition.id,
          achievementVersionId: version!.id,
          unlockInstance: 1, // 2.b solo produce la instancia 1 (repeatability = UNIQUE)
          unlockedAt: new Date(),
          triggerActivityId: lastActivityId,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo completando el logro "${definition.achievementKey}" para la cuenta ${accountId}: ${message}`);
      return false;
    }

    return this.repairAchievementRewardChain(accountId, definition, version, unlock);
  }

  private parseRuleOrNull(version: AchievementVersion, definition: AchievementDefinition): XpThresholdUnlockRule | null {
    try {
      return parseUnlockRule(version.unlockRule);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`unlockRule inválido en achievement_version ${version.id} (logro "${definition.achievementKey}"): ${message}`);
      return null;
    }
  }

  /**
   * Repara la cadena de entrega de un logro ya `COMPLETED` -- se invoca
   * tanto justo después de completar (con `knownUnlock` ya en mano) como
   * en cualquier reintento posterior sobre una fila que YA estaba
   * `COMPLETED` (buscando el unlock por `findByAccountDefinitionInstance`).
   * Si el unlock falta (no debería ocurrir bajo la transacción atómica de
   * `evaluateAchievementDefinition`, pero esta función no lo asume) se
   * registra como anomalía y se aísla como fallo de esta cuenta, sin
   * fabricar un unlock sintético. Si el `reward_grant` falta, se crea
   * (reutilizando `deliverBundleComponents`) y se adjunta con
   * `attachRewardGrant` (validación de coherencia incluida). Si el grant
   * ya existe, reintenta únicamente los componentes `XP_BONUS` no
   * `DELIVERED` -- los `DELIVERED` nunca se tocan.
   */
  private async repairAchievementRewardChain(
    accountId: string,
    definition: AchievementDefinition,
    version: AchievementVersion,
    knownUnlock: AchievementUnlock | null,
  ): Promise<boolean> {
    const unlock = knownUnlock ?? (await this.achievementUnlockRepo.findByAccountDefinitionInstance(accountId, definition.id, 1));
    if (!unlock) {
      this.logger.error(
        `achievement_progress COMPLETED sin achievement_unlock correspondiente -- anomalía de integridad (cuenta ${accountId}, logro "${definition.achievementKey}").`,
      );
      return false;
    }

    if (version.rewardBundleId == null) return true; // logro sin recompensa configurada -- nada más que hacer

    if (unlock.rewardGrantId == null) {
      const bundle = await this.bundleRepo.findById(version.rewardBundleId);
      if (!bundle) {
        this.logger.error(`AchievementVersion ${version.id} referencia un reward_bundle_id inexistente (${version.rewardBundleId}).`);
        return false;
      }
      const { grant, allResolved } = await this.deliverBundleComponents(accountId, bundle, 'ACHIEVEMENT_UNLOCK', unlock.id);
      try {
        await this.achievementUnlockRepo.attachRewardGrant(unlock, grant);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Fallo adjuntando reward_grant ${grant.id} al achievement_unlock ${unlock.id}: ${message}`);
        return false;
      }
      return allResolved;
    }

    const grant = await this.grantRepo.findById(unlock.rewardGrantId);
    if (!grant) {
      this.logger.error(`achievement_unlock ${unlock.id} referencia un reward_grant_id inexistente (${unlock.rewardGrantId}).`);
      return false;
    }
    let allResolved = true;
    for (const component of grant.components) {
      if (component.deliveryStatus === 'DELIVERED') continue;
      if (component.componentType === 'XP_BONUS') {
        const delivered = await this.deliverXpBonusComponent(accountId, component);
        if (!delivered) allResolved = false;
      } else if (component.componentType === 'TITLE') {
        const delivered = await this.deliverTitleComponent(accountId, grant, component);
        if (!delivered) allResolved = false;
      } else if (component.componentType === 'COSMETIC') {
        const delivered = await this.deliverCosmeticComponent(accountId, grant, component);
        if (!delivered) allResolved = false;
      }
    }
    return allResolved;
  }

  /**
   * Bloque III, sub-incremento 4.b (§4.16) -- consume ÚNICAMENTE
   * `pendingEntries`, filtrado a `entryType = OTORGAMIENTO` (excluye
   * `BONO` -- evita que la propia recompensa retroalimente el progreso del
   * desafío --, `REVERSO` y `AJUSTE`). Ningún dato fuera de lo que
   * `evaluateAccount` ya recibía -- la frontera del worker no se ensancha.
   */
  private async evaluateChallenges(accountId: string, pendingEntries: XpLedgerEntry[]): Promise<boolean> {
    const eligibleEntries = pendingEntries.filter((entry) => entry.entryType === 'OTORGAMIENTO');
    if (eligibleEntries.length === 0) return true;

    let allResolved = true;
    for (const entry of eligibleEntries) {
      const definitions = await this.challengeDefinitionRepo.findActiveContainingInstant(entry.occurredAt);
      for (const definition of definitions) {
        const resolved = await this.evaluateChallengeEventForDefinition(accountId, definition, entry);
        if (!resolved) allResolved = false;
      }
    }
    return allResolved;
  }

  /**
   * Procesa UN evento contra UNA `challenge_definition` ACTIVA cuya
   * ventana ya contiene `entry.occurredAt` (filtrado por el llamador --
   * Gate 18: un evento fuera de ventana no llega aquí para esa definición).
   *
   * `eligibility_rule`/`completion_rule` se parsean con la MISMA disciplina
   * (§4.16(b)/(c)) -- una definición con cualquiera de las dos mal
   * formada es un error de configuración de ESA definición, aislado (no
   * detiene otras definiciones ni otras cuentas), nunca un default
   * silencioso. `eligibility_rule` hoy solo admite `ALL_ACCOUNTS` -- no hay
   * segmentación que aplicar todavía, pero la validación ocurre igual
   * (corrección §4.16(c): el campo no se ignora).
   *
   * Dedup -> `daily_cap` -> incremento, en UNA sola transacción
   * `SERIALIZABLE` (§4.16(d)) -- lectura y escritura sobre el MISMO `tx`.
   * Un evento bloqueado por `daily_cap` queda igualmente CONSUMIDO
   * (§4.16(e)): "consumido" y "contribuyó" son hechos independientes.
   */
  private async evaluateChallengeEventForDefinition(accountId: string, definition: ChallengeDefinition, entry: XpLedgerEntry): Promise<boolean> {
    let completionRule: ReturnType<typeof parseCompletionRule>;
    try {
      parseEligibilityRule(definition.eligibilityRule);
      completionRule = parseCompletionRule(definition.completionRule);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`challenge_definition "${definition.challengeKey}" tiene eligibility_rule/completion_rule inválida: ${message}`);
      return false;
    }

    try {
      await this.txRunner.run(
        async (tx) => {
          const { accountChallenge } = await this.accountChallengeRepo.createIdempotent(tx, {
            accountId,
            challengeDefinitionId: definition.id,
            targetValue: completionRule.targetValue,
            periodStart: definition.startsAt,
            periodEnd: definition.endsAt,
            acceptedAt: new Date(),
          });

          // Terminal para progreso (Gate 17: nunca retrocede) -- nada más que hacer.
          if (accountChallenge.challengeStatus === 'COMPLETED' || accountChallenge.challengeStatus === 'CLAIMED') return;

          const consumed = await this.consumedEventRepo.tryConsume(tx, accountChallenge.id, entry.id);
          if (!consumed) return; // ya procesado -- idempotencia de lote (Gate 27)

          const localDate = utcDayStart(entry.occurredAt);
          const daily = await this.dailyProgressRepo.findByAccountChallengeAndDate(accountChallenge.id, localDate, tx);
          const underCap = definition.dailyCap == null || (daily?.contributionCount ?? 0) < definition.dailyCap;
          if (!underCap) return; // consumido pero sin contribución -- §4.16(e)

          await this.dailyProgressRepo.upsertContribution(tx, accountChallenge.id, localDate);

          const newProgressValue = Math.min(accountChallenge.progressValue + 1, accountChallenge.targetValue);
          const reachesTarget = newProgressValue >= accountChallenge.targetValue;

          if (accountChallenge.challengeStatus === 'ACCEPTED') {
            // ACCEPTED -> COMPLETED directo no es una transición válida (Gate 17)
            // -- dos sentencias sucesivas dentro de la MISMA transacción.
            await this.accountChallengeRepo.advanceProgress(tx, accountChallenge.id, newProgressValue, 'IN_PROGRESS');
            if (reachesTarget) {
              await this.accountChallengeRepo.advanceProgress(tx, accountChallenge.id, newProgressValue, 'COMPLETED');
            }
          } else {
            await this.accountChallengeRepo.advanceProgress(tx, accountChallenge.id, newProgressValue, reachesTarget ? 'COMPLETED' : null);
          }
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo evaluando el desafío "${definition.challengeKey}" para la cuenta ${accountId} (evento ${entry.id}): ${message}`);
      return false;
    }
    return true;
  }

  /**
   * Descubre cuentas con actividad no procesada. Implementación
   * deliberadamente simple (N+1: una consulta de cursor + una de
   * existencia por cuenta candidata) -- la escala actual del proyecto no
   * justifica una consulta agregada más compleja; documentado, no oculto,
   * mismo criterio que ADR-0005 documentó su limitación de réplica única.
   */
  async discoverPendingAccounts(now: Date = new Date()): Promise<string[]> {
    const candidates = await this.prisma.xpLedgerEntry.findMany({ distinct: ['accountId'], select: { accountId: true } });
    const pending: string[] = [];
    for (const { accountId } of candidates) {
      const cursor = await this.cursorRepo.findByAccountId(accountId);
      if (cursor && cursor.nextEligibleAt > now) continue; // en backoff, todavía no reintentar

      const cursorPosition =
        cursor?.lastProcessedRecordedAt && cursor.lastProcessedEntryId
          ? { recordedAt: cursor.lastProcessedRecordedAt, entryId: cursor.lastProcessedEntryId }
          : null;
      const hasPending = await this.ledgerRepo.hasEntryAfter(accountId, cursorPosition);
      if (hasPending) pending.push(accountId);
    }
    return pending;
  }

  /**
   * Procesa UNA cuenta: adquiere el advisory lock (no bloqueante -- si otro
   * proceso ya lo sostiene, se salta esta cuenta esta vez, sin error), lee
   * el lote pendiente con el mismo "techo" con el que se descubrió (dentro
   * de la misma transacción), evalúa (`evaluateAccount`, desde 1.c: entrega
   * de recompensas de nivel), y avanza el cursor a la posición EXACTA de
   * la última entrada procesada
   * -- nunca más allá. Un fallo se aísla: se registra vía
   * `cursorRepo.upsertFailure` (transacción nueva, independiente de la que
   * se revirtió) y no se propaga a otras cuentas del lote.
   */
  async processAccount(accountId: string): Promise<ProcessAccountOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_NAMESPACE}, hashtext(${accountId})) AS locked
        `;
        if (!lockRows[0]?.locked) {
          return 'SKIPPED_LOCKED';
        }

        const cursor = await this.cursorRepo.findByAccountId(accountId, tx);
        const cursorPosition =
          cursor?.lastProcessedRecordedAt && cursor.lastProcessedEntryId
            ? { recordedAt: cursor.lastProcessedRecordedAt, entryId: cursor.lastProcessedEntryId }
            : null;

        const pendingEntries = await this.ledgerRepo.findPendingSince(accountId, cursorPosition, tx);
        if (pendingEntries.length === 0) {
          return 'PROCESSED';
        }

        await this.evaluateAccount(tx, accountId, pendingEntries);

        const last = pendingEntries[pendingEntries.length - 1]!;
        await this.cursorRepo.upsertSuccess(accountId, last.recordedAt, last.id, tx);
        return 'PROCESSED';
      });
    } catch (error) {
      const attemptsSoFar = (await this.cursorRepo.findByAccountId(accountId))?.attempts ?? 0;
      const nextEligibleAt = new Date(Date.now() + backoffFor(attemptsSoFar));
      await this.cursorRepo.upsertFailure(accountId, nextEligibleAt);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo evaluando recompensas para la cuenta ${accountId}: ${message}`);
      return 'FAILED';
    }
  }

  /** Aislamiento de fallo por cuenta: un error en una no detiene el resto (mismo patrón que XpGrantService.grantPending/GamificationService.ingestPending). */
  async run(now: Date = new Date()): Promise<{ processed: number; skippedLocked: number; failed: number }> {
    const accountIds = await this.discoverPendingAccounts(now);
    let processed = 0;
    let skippedLocked = 0;
    let failed = 0;

    for (const accountId of accountIds) {
      const outcome = await this.processAccount(accountId);
      if (outcome === 'PROCESSED') processed++;
      else if (outcome === 'SKIPPED_LOCKED') skippedLocked++;
      else failed++;
    }

    return { processed, skippedLocked, failed };
  }
}
