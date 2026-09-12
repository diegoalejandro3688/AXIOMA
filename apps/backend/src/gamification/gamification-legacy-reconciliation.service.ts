import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../platform/prisma/prisma.service';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { gamificationActorRef } from './gamification-actor-ref';
import { buildLegacyRewardSourceId, buildRewardSourceIdV2, isLegacyEmbeddingActivityType, activityLegacyKeyPrefix, buildActivityDedupKeyV2FromRow } from './gamification-key';

/**
 * WEB-0D.1C-B5 -- clasificación de anomalías legado/reconciliación. Ver el
 * reporte de B5 §B/§C para la taxonomía completa. Cada fila auditada recibe
 * EXACTAMENTE una de estas clasificaciones -- nunca se adivina, nunca se
 * repara automáticamente fuera de `DETERMINISTIC_REWRITE`.
 */
export type B5ReasonCode =
  | 'DETERMINISTIC_REWRITE' // Segura para reescritura atómica (legacy->v2 o solo transición de identidad).
  | 'DUPLICATE_EQUIVALENT' // Fila legacy + destino v2 YA existen -- colisión, preservada, nunca fusionada.
  | 'MALFORMED_LEGACY' // Clave/identidad con forma inesperada -- nunca reconstruida por adivinanza.
  | 'IDENTITY_INVARIANT_VIOLATION' // accountId+actorRef ambos presentes o ambos ausentes (viola el CHECK de B1-R1 -- residuo pre-migración/test).
  | 'TERMINAL_PARTICIPATION_BASELINE' // SeasonLeagueParticipation CLOSED+terminal+cruda -- backlog B4-R1.
  | 'ALREADY_PSEUDONYMIZED'; // Ya en estado PSEUDONYMIZED válido -- informativo, nunca tocado.

export interface B5AuditEntry {
  model: 'RewardGrant' | 'ValidatedGamificationActivity' | 'SeasonLeagueParticipation' | 'XpLedgerEntry' | 'AchievementProgress' | 'AchievementUnlock' | 'LeaguePointLedgerEntry';
  rowId: string;
  reasonCode: B5ReasonCode;
  /** Tipo de negocio (sourceEntityType/activityType) -- NUNCA accountId crudo ni clave completa. */
  businessType?: string;
}

export interface B5AuditSummary {
  totalRowsAudited: number;
  byModel: Record<string, number>;
  byReasonCode: Record<B5ReasonCode, number>;
}

export interface B5AuditReport {
  summary: B5AuditSummary;
  deterministic: B5AuditEntry[];
  duplicates: B5AuditEntry[];
  malformed: B5AuditEntry[];
  identityViolations: B5AuditEntry[];
  terminalParticipationBaseline: B5AuditEntry[];
}

export interface B5ReconciliationResult {
  applied: boolean;
  secretMissing: boolean;
  accountsWithDeterministicRows: number;
  accountsFullyRepaired: number;
  accountsPartial: number; // PARTIAL_RECONCILIATION_REQUIRED -- filas deterministas de la cuenta NO se tocaron porque comparten cuenta con una ambigua y la independencia no pudo probarse (ver B5 §17).
  rewardGrantRepaired: number;
  validatedActivityRepaired: number;
  seasonParticipationRepaired: number;
  report: B5AuditReport;
}

const TERMINAL_PARTICIPATION_STATUSES = ['PROMOTED', 'DEMOTED', 'RETAINED'] as const;
/** WEB-0D.1C-B2 -- únicas fuentes que alguna vez embebieron accountId crudo en RewardGrant.sourceEntityId. */
const LEGACY_EMBEDDING_REWARD_SOURCE_TYPES = new Set(['LEVEL', 'STUDY_SUBJECT']);

/**
 * WEB-0D.1C-B5 -- auditoría de solo-lectura + reconciliación DETERMINISTA
 * acotada de anomalías legado que B3/B4 dejaron deliberadamente diferidas.
 *
 * Principio rector (ver el reporte de B5 §0/§19): este servicio NUNCA borra,
 * NUNCA fusiona, NUNCA elige un "ganador" entre filas ambiguas. Solo repara
 * el subconjunto DETERMINISTIC_REWRITE -- exactamente las mismas condiciones
 * de seguridad que B3-R1/B4 ya usan para RewardGrant/ValidatedGamificationActivity,
 * aplicadas aquí a filas HISTÓRICAS que quedaron sin reparar (nunca a filas
 * nuevas, que B3/B4 ya cubren en el momento del cierre/finalización).
 *
 * `--dry-run` (default) NUNCA muta nada -- solo clasifica y cuenta.
 * `--apply` requiere invocación explícita del operador (ver
 * `reconcile({ apply: true })`); nunca se conecta a ningún scheduler/startup.
 */
@Injectable()
export class GamificationLegacyReconciliationService {
  private readonly logger = new Logger(GamificationLegacyReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionRunner: TransactionRunnerService,
    private readonly config?: ConfigService,
  ) {}

  private getGamificationSecret(): string {
    const secret = this.config?.get<string>('GAMIFICATION_ACTOR_SECRET') ?? process.env.GAMIFICATION_ACTOR_SECRET;
    if (!secret) {
      throw new Error('GAMIFICATION_ACTOR_SECRET no está configurado -- no se puede clasificar/reconciliar el legado de gamificación.');
    }
    return secret;
  }

  // ==========================================================================
  // AUDITORÍA -- SOLO LECTURA, nunca muta nada, segura de invocar en cualquier
  // base (incluida axioma_dev en modo lectura, ver el reporte de B5 §5).
  // ==========================================================================

  /**
   * B5 §4/§5 -- inventario completo de anomalías. Requiere el secreto SOLO
   * para poder distinguir DETERMINISTIC_REWRITE de DUPLICATE_EQUIVALENT
   * (necesita derivar la clave v2 esperada para comprobar si ya existe) --
   * si el secreto falta, esas dos categorías colapsan de forma conservadora
   * a un conteo "sin clasificar" (nunca se asume DETERMINISTIC sin poder
   * probarlo).
   */
  async runAudit(): Promise<B5AuditReport> {
    let secret: string | null = null;
    try {
      secret = this.getGamificationSecret();
    } catch {
      secret = null;
    }

    const rewardGrantEntries = await this.auditRewardGrants(secret);
    const activityEntries = await this.auditValidatedActivities(secret);
    const participationEntries = await this.auditTerminalParticipationBaseline();
    const identityViolationEntries = await this.auditIdentityInvariantViolations();

    const all = [...rewardGrantEntries, ...activityEntries, ...participationEntries, ...identityViolationEntries];

    const byModel: Record<string, number> = {};
    const byReasonCode: Record<string, number> = {};
    for (const entry of all) {
      byModel[entry.model] = (byModel[entry.model] ?? 0) + 1;
      byReasonCode[entry.reasonCode] = (byReasonCode[entry.reasonCode] ?? 0) + 1;
    }

    return {
      summary: {
        totalRowsAudited: all.length,
        byModel,
        byReasonCode: byReasonCode as Record<B5ReasonCode, number>,
      },
      deterministic: all.filter((e) => e.reasonCode === 'DETERMINISTIC_REWRITE'),
      duplicates: all.filter((e) => e.reasonCode === 'DUPLICATE_EQUIVALENT'),
      malformed: all.filter((e) => e.reasonCode === 'MALFORMED_LEGACY'),
      identityViolations: identityViolationEntries,
      terminalParticipationBaseline: participationEntries,
    };
  }

  /** B5 §6/§7/§10 -- clasifica cada RewardGrant identificable de una cuenta CLOSED. Sin FK a `account` (mismo criterio que el resto del dominio) -- JOIN en SQL crudo. */
  private async auditRewardGrants(secret: string | null): Promise<B5AuditEntry[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; account_id: string; source_entity_type: string; source_entity_id: string }[]>`
      SELECT rg.id, rg.account_id, rg.source_entity_type, rg.source_entity_id
      FROM reward_grant rg
      JOIN account a ON a.id = rg.account_id
      WHERE rg.account_id IS NOT NULL AND rg.gamification_actor_ref IS NULL AND a.status = 'CLOSED'
    `;

    const entries: B5AuditEntry[] = [];
    for (const row of rows) {
      const accountId = row.account_id;
      const sourceEntityType = row.source_entity_type;
      const sourceEntityId = row.source_entity_id;
      const isLegacyEmbedding = LEGACY_EMBEDDING_REWARD_SOURCE_TYPES.has(sourceEntityType) && !sourceEntityId.startsWith('v2:');

      if (!isLegacyEmbedding) {
        entries.push({ model: 'RewardGrant', rowId: row.id, reasonCode: 'DETERMINISTIC_REWRITE', businessType: sourceEntityType });
        continue;
      }

      const separatorIndex = sourceEntityId.indexOf(':');
      const businessKey = separatorIndex >= 0 ? sourceEntityId.slice(separatorIndex + 1) : sourceEntityId;
      const legacyExpected = buildLegacyRewardSourceId(accountId, businessKey);
      if (legacyExpected !== sourceEntityId) {
        entries.push({ model: 'RewardGrant', rowId: row.id, reasonCode: 'MALFORMED_LEGACY', businessType: sourceEntityType });
        continue;
      }

      if (!secret) {
        // Sin secreto no se puede derivar el destino v2 -- no se asume nada,
        // se omite de este reporte (ni deterministic ni duplicate). Se
        // vuelve a auditar en la próxima corrida con secreto disponible.
        continue;
      }

      const v2SourceEntityId = buildRewardSourceIdV2(accountId, secret, businessKey);
      const v2IdempotencyKey = `reward:${sourceEntityType}:${v2SourceEntityId}`;
      const existingV2 = await this.prisma.rewardGrant.findUnique({ where: { idempotencyKey: v2IdempotencyKey }, select: { id: true } });
      if (existingV2) {
        entries.push({ model: 'RewardGrant', rowId: row.id, reasonCode: 'DUPLICATE_EQUIVALENT', businessType: sourceEntityType });
        continue;
      }

      entries.push({ model: 'RewardGrant', rowId: row.id, reasonCode: 'DETERMINISTIC_REWRITE', businessType: sourceEntityType });
    }
    return entries;
  }

  /** B5 §8/§9/§10 -- clasifica cada ValidatedGamificationActivity identificable de una cuenta CLOSED. Sin FK a `account` -- JOIN en SQL crudo. */
  private async auditValidatedActivities(secret: string | null): Promise<B5AuditEntry[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; account_id: string; activity_type: string; deduplication_key: string }[]>`
      SELECT vga.id, vga.account_id, vga.activity_type, vga.deduplication_key
      FROM validated_gamification_activity vga
      JOIN account a ON a.id = vga.account_id
      WHERE vga.account_id IS NOT NULL AND vga.gamification_actor_ref IS NULL AND a.status = 'CLOSED'
    `;

    const entries: B5AuditEntry[] = [];
    for (const row of rows) {
      const accountId = row.account_id;
      const activityType = row.activity_type;
      const deduplicationKey = row.deduplication_key;

      if (!isLegacyEmbeddingActivityType(activityType) || deduplicationKey.includes(':v2:')) {
        entries.push({ model: 'ValidatedGamificationActivity', rowId: row.id, reasonCode: 'DETERMINISTIC_REWRITE', businessType: activityType });
        continue;
      }

      const expectedPrefix = activityLegacyKeyPrefix(activityType, accountId);
      if (!deduplicationKey.startsWith(expectedPrefix)) {
        entries.push({ model: 'ValidatedGamificationActivity', rowId: row.id, reasonCode: 'MALFORMED_LEGACY', businessType: activityType });
        continue;
      }

      if (!secret) continue;

      const businessKey = deduplicationKey.slice(expectedPrefix.length);
      const v2Key = buildActivityDedupKeyV2FromRow(activityType, accountId, secret, businessKey);
      const existingV2 = await this.prisma.validatedGamificationActivity.findUnique({ where: { deduplicationKey: v2Key }, select: { id: true } });
      if (existingV2) {
        entries.push({ model: 'ValidatedGamificationActivity', rowId: row.id, reasonCode: 'DUPLICATE_EQUIVALENT', businessType: activityType });
        continue;
      }

      entries.push({ model: 'ValidatedGamificationActivity', rowId: row.id, reasonCode: 'DETERMINISTIC_REWRITE', businessType: activityType });
    }
    return entries;
  }

  /**
   * B5 §12 -- backlog de línea base de SeasonLeagueParticipation (mismo
   * predicado EXACTO que B4-R1's `findAccountIdsWithTerminalPendingPrivacy`,
   * a nivel de FILA en vez de cuenta, para el reporte). Sin ambigüedad
   * posible por construcción (ver el reporte de B5 §I): `(accountId,
   * gameSeasonId)` ya era único ANTES de pseudonimizar, y `actorRef` es una
   * función determinística e inyectiva de `accountId` -- nunca hay
   * colisión, nunca hay forma legacy que reescribir (este modelo no tiene
   * clave embebida). Cada fila del predicado es SIEMPRE `DETERMINISTIC_REWRITE`
   * (clasificada aquí como `TERMINAL_PARTICIPATION_BASELINE` para
   * distinguirla en el reporte, ver B5 §18).
   */
  private async auditTerminalParticipationBaseline(): Promise<B5AuditEntry[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT slp.id
      FROM season_league_participation slp
      JOIN account a ON a.id = slp.account_id
      WHERE a.status = 'CLOSED'
        AND slp.participation_status IN ('PROMOTED', 'DEMOTED', 'RETAINED')
        AND slp.account_id IS NOT NULL
        AND slp.gamification_actor_ref IS NULL
    `;
    return rows.map((r) => ({ model: 'SeasonLeagueParticipation' as const, rowId: r.id, reasonCode: 'TERMINAL_PARTICIPATION_BASELINE' as const }));
  }

  /**
   * B5 §11 -- violaciones del invariante de identidad de B1
   * (`accountId != NULL XOR actorRef != NULL`) a través de los 7 modelos.
   * El CHECK de B1-R1 debería impedir que esto ocurra para escrituras
   * nuevas -- cualquier fila encontrada aquí es residuo pre-migración/de
   * pruebas. NUNCA se repara automáticamente (requeriría adivinar cuál
   * campo es el correcto).
   */
  private async auditIdentityInvariantViolations(): Promise<B5AuditEntry[]> {
    const entries: B5AuditEntry[] = [];
    const models: Array<{ model: B5AuditEntry['model']; rows: () => Promise<{ id: string }[]> }> = [
      { model: 'XpLedgerEntry', rows: () => this.prisma.$queryRaw`SELECT id FROM xp_ledger_entry WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'RewardGrant', rows: () => this.prisma.$queryRaw`SELECT id FROM reward_grant WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'AchievementProgress', rows: () => this.prisma.$queryRaw`SELECT id FROM achievement_progress WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'AchievementUnlock', rows: () => this.prisma.$queryRaw`SELECT id FROM achievement_unlock WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'LeaguePointLedgerEntry', rows: () => this.prisma.$queryRaw`SELECT id FROM league_point_ledger_entry WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'ValidatedGamificationActivity', rows: () => this.prisma.$queryRaw`SELECT id FROM validated_gamification_activity WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
      { model: 'SeasonLeagueParticipation', rows: () => this.prisma.$queryRaw`SELECT id FROM season_league_participation WHERE (account_id IS NOT NULL AND gamification_actor_ref IS NOT NULL) OR (account_id IS NULL AND gamification_actor_ref IS NULL)` },
    ];
    for (const { model, rows } of models) {
      const found = await rows();
      for (const r of found) entries.push({ model, rowId: r.id, reasonCode: 'IDENTITY_INVARIANT_VIOLATION' });
    }
    return entries;
  }

  // ==========================================================================
  // RECONCILIACIÓN -- dry-run por defecto; `apply: true` requiere invocación
  // EXPLÍCITA del operador (nunca automática, nunca vía scheduler/startup).
  // ==========================================================================

  /**
   * B5 §13/§14/§15/§16/§17 -- reconciliación acotada del subconjunto
   * DETERMINISTIC_REWRITE únicamente. `apply = false` (default): audita y
   * cuenta, CERO mutaciones. `apply = true`: repara por cuenta, en su
   * propia transacción, re-verificando CLOSED en fresco (mismo contrato
   * EXACTO que B3-R1/B4).
   *
   * B5 §17 -- si una cuenta tiene AMBOS tipos de fila (determinista +
   * ambigua) para el MISMO modelo (RewardGrant o ValidatedGamificationActivity),
   * las filas deterministas de esa cuenta SÍ se reparan de forma
   * independiente (no comparten unicidad/dependencia de negocio entre sí --
   * cada fila legacy resuelve a su PROPIO destino v2, nunca al de otra
   * fila) -- la cuenta se reporta como `accountsPartial` (PARTIAL_RECONCILIATION_REQUIRED)
   * y la fila ambigua NUNCA se toca.
   */
  async reconcile(options: { apply: boolean; limit?: number } = { apply: false }): Promise<B5ReconciliationResult> {
    const report = await this.runAudit();

    if (!options.apply) {
      return {
        applied: false,
        secretMissing: false,
        accountsWithDeterministicRows: 0,
        accountsFullyRepaired: 0,
        accountsPartial: 0,
        rewardGrantRepaired: 0,
        validatedActivityRepaired: 0,
        seasonParticipationRepaired: 0,
        report,
      };
    }

    let secret: string;
    try {
      secret = this.getGamificationSecret();
    } catch {
      this.logger.error('B5 reconcile(apply=true): GAMIFICATION_ACTOR_SECRET ausente -- corrida completa NO-OP, cero mutaciones.');
      return {
        applied: true,
        secretMissing: true,
        accountsWithDeterministicRows: 0,
        accountsFullyRepaired: 0,
        accountsPartial: 0,
        rewardGrantRepaired: 0,
        validatedActivityRepaired: 0,
        seasonParticipationRepaired: 0,
        report,
      };
    }

    const limit = options.limit;

    // Agrupa filas deterministas de RewardGrant/ValidatedActivity por
    // cuenta -- se resuelve a nivel de cuenta (accountId no viaja en
    // B5AuditEntry, así que se re-consulta acotado a los rowIds deterministas).
    const deterministicRewardGrantIds = report.deterministic.filter((e) => e.model === 'RewardGrant').map((e) => e.rowId);
    const deterministicActivityIds = report.deterministic.filter((e) => e.model === 'ValidatedGamificationActivity').map((e) => e.rowId);
    const ambiguousRewardGrantIds = new Set([...report.duplicates, ...report.malformed].filter((e) => e.model === 'RewardGrant').map((e) => e.rowId));
    const ambiguousActivityIds = new Set([...report.duplicates, ...report.malformed].filter((e) => e.model === 'ValidatedGamificationActivity').map((e) => e.rowId));

    const rewardGrantRows = deterministicRewardGrantIds.length
      ? await this.prisma.rewardGrant.findMany({ where: { id: { in: deterministicRewardGrantIds } }, select: { id: true, accountId: true, sourceEntityType: true, sourceEntityId: true } })
      : [];
    const activityRows = deterministicActivityIds.length
      ? await this.prisma.validatedGamificationActivity.findMany({ where: { id: { in: deterministicActivityIds } }, select: { id: true, accountId: true, activityType: true, deduplicationKey: true } })
      : [];
    // Cuentas con AL MENOS una fila ambigua (RewardGrant o ValidatedActivity) -- para el reporte PARTIAL.
    const ambiguousAccountRows = await this.prisma.$queryRaw<{ account_id: string }[]>`
      SELECT DISTINCT account_id FROM reward_grant WHERE id = ANY(${[...ambiguousRewardGrantIds]}) AND account_id IS NOT NULL
      UNION
      SELECT DISTINCT account_id FROM validated_gamification_activity WHERE id = ANY(${[...ambiguousActivityIds]}) AND account_id IS NOT NULL
    `;
    const ambiguousAccounts = new Set(ambiguousAccountRows.map((r) => r.account_id));

    const accountIds = new Set<string>([...rewardGrantRows.map((r) => r.accountId as string), ...activityRows.map((r) => r.accountId as string)]);
    const terminalParticipationAccountIds = await this.findTerminalParticipationBaselineAccountIds(limit ?? 1000);
    for (const id of terminalParticipationAccountIds) accountIds.add(id);

    let accountsFullyRepaired = 0;
    let accountsPartial = 0;
    let rewardGrantRepaired = 0;
    let validatedActivityRepaired = 0;
    let seasonParticipationRepaired = 0;

    let processed = 0;
    for (const accountId of accountIds) {
      if (limit !== undefined && processed >= limit) break;
      processed++;

      const actorRef = gamificationActorRef(accountId, secret);
      const isPartial = ambiguousAccounts.has(accountId);

      const result = await this.transactionRunner.run(async (tx) => {
        const account = await tx.account.findUnique({ where: { id: accountId }, select: { status: true } });
        if (account?.status !== 'CLOSED') return { rg: 0, va: 0, slp: 0 };

        let rg = 0;
        for (const row of rewardGrantRows.filter((r) => r.accountId === accountId)) {
          const isLegacyEmbedding = LEGACY_EMBEDDING_REWARD_SOURCE_TYPES.has(row.sourceEntityType) && !row.sourceEntityId.startsWith('v2:');
          let data: Prisma.RewardGrantUpdateInput = { accountId: null, gamificationActorRef: actorRef };
          if (isLegacyEmbedding) {
            const separatorIndex = row.sourceEntityId.indexOf(':');
            const businessKey = separatorIndex >= 0 ? row.sourceEntityId.slice(separatorIndex + 1) : row.sourceEntityId;
            const v2SourceEntityId = buildRewardSourceIdV2(accountId, secret, businessKey);
            data = { ...data, sourceEntityId: v2SourceEntityId, idempotencyKey: `reward:${row.sourceEntityType}:${v2SourceEntityId}` };
          }
          const updateResult = await tx.rewardGrant.updateMany({ where: { id: row.id, accountId, gamificationActorRef: null }, data });
          rg += updateResult.count;
        }

        let va = 0;
        for (const row of activityRows.filter((r) => r.accountId === accountId)) {
          let data: Prisma.ValidatedGamificationActivityUpdateInput = { accountId: null, gamificationActorRef: actorRef };
          if (isLegacyEmbeddingActivityType(row.activityType) && !row.deduplicationKey.includes(':v2:')) {
            const expectedPrefix = activityLegacyKeyPrefix(row.activityType, accountId);
            const businessKey = row.deduplicationKey.slice(expectedPrefix.length);
            data = { ...data, deduplicationKey: buildActivityDedupKeyV2FromRow(row.activityType, accountId, secret, businessKey) };
          }
          const updateResult = await tx.validatedGamificationActivity.updateMany({ where: { id: row.id, accountId, gamificationActorRef: null }, data });
          va += updateResult.count;
        }

        const slpResult = await tx.seasonLeagueParticipation.updateMany({
          where: { accountId, gamificationActorRef: null, participationStatus: { in: [...TERMINAL_PARTICIPATION_STATUSES] } },
          data: { accountId: null, gamificationActorRef: actorRef },
        });

        return { rg, va, slp: slpResult.count };
      });

      rewardGrantRepaired += result.rg;
      validatedActivityRepaired += result.va;
      seasonParticipationRepaired += result.slp;
      if (result.rg > 0 || result.va > 0 || result.slp > 0) {
        if (isPartial) accountsPartial++;
        else accountsFullyRepaired++;
      }
    }

    this.logger.log(
      `B5 reconcile(apply=true): ${accountsFullyRepaired} cuenta(s) reparada(s) por completo, ${accountsPartial} parcial(es) (PARTIAL_RECONCILIATION_REQUIRED -- filas ambiguas preservadas) -- RewardGrant ${rewardGrantRepaired}, ValidatedGamificationActivity ${validatedActivityRepaired}, SeasonLeagueParticipation ${seasonParticipationRepaired}.`,
    );

    return {
      applied: true,
      secretMissing: false,
      accountsWithDeterministicRows: accountIds.size,
      accountsFullyRepaired,
      accountsPartial,
      rewardGrantRepaired,
      validatedActivityRepaired,
      seasonParticipationRepaired,
      report,
    };
  }

  private async findTerminalParticipationBaselineAccountIds(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ account_id: string }[]>`
      SELECT DISTINCT slp.account_id
      FROM season_league_participation slp
      JOIN account a ON a.id = slp.account_id
      WHERE a.status = 'CLOSED'
        AND slp.participation_status IN ('PROMOTED', 'DEMOTED', 'RETAINED')
        AND slp.account_id IS NOT NULL
        AND slp.gamification_actor_ref IS NULL
      ORDER BY slp.account_id ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.account_id);
  }
}
