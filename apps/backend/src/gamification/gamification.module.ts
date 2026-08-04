import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { GamificationProgramRepository } from './gamification-program.repository';
import { GamificationProgramVersionRepository } from './gamification-program-version.repository';
import { XpRuleRepository } from './xp-rule.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { XpBalanceRepository } from './xp-balance.repository';
import { XpGrantAttemptRepository } from './xp-grant-attempt.repository';
import { GamificationService } from './gamification.service';
import { GamificationScheduler } from './gamification.scheduler';
import { XpGrantService } from './xp-grant.service';
import { XpGrantScheduler } from './xp-grant.scheduler';
import { GamificationController } from './gamification.controller';
import { LevelDefinitionRepository } from './level-definition.repository';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';
import { RewardBundleRepository } from './reward-bundle.repository';
import { RewardGrantRepository } from './reward-grant.repository';
import { RewardGrantComponentRepository } from './reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from './reward-evaluation-cursor.repository';
import { RewardEvaluationWorker } from './reward-evaluation.worker';
import { RewardEvaluationScheduler } from './reward-evaluation.scheduler';
import { AchievementDefinitionRepository } from './achievement-definition.repository';
import { AchievementVersionRepository } from './achievement-version.repository';
import { AchievementProgressRepository } from './achievement-progress.repository';
import { AchievementUnlockRepository } from './achievement-unlock.repository';
import { TitleDefinitionRepository } from './title-definition.repository';
import { AccountTitleRepository } from './account-title.repository';

/**
 * Dominio GAMIFICATION, Learning Experience Foundation -- ver
 * docs/adr/0016-gamificacion-fundacion.md,
 * docs/adr/0017-entrega-multiconsumidor-outbox.md y
 * docs/adr/BLOCK-II-DEFINITION.md.
 *
 * Bloque I: conversión validated_gamification_activity -> xp_ledger_entry
 * mediante reglas versionadas (XpGrantService/XpGrantScheduler), con
 * xp_balance como proyección reconstruible.
 *
 * Bloque II (incremento "Progresión visible"): expone en modo lectura
 * niveles/racha/historial ya calculados por el Bloque I
 * (LevelDefinitionRepository/ProgressionService/ProgressionController) --
 * no modifica el otorgamiento de XP.
 *
 * Bloque III, sub-incremento 1.a ("Fundación de persistencia", ADR-0019):
 * esquema y repositorios mínimos de `reward_bundle`/`reward_grant`/
 * `reward_grant_component`/`reward_evaluation_cursor`.
 *
 * Sub-incremento 1.b (`RewardEvaluationWorker`/`RewardEvaluationScheduler`):
 * descubrimiento de cuentas pendientes, exclusión mutua por cuenta
 * (advisory lock), aislamiento de fallo, backoff, cron + endpoint interno.
 * SIN evaluación real de niveles/logros/desafíos, SIN creación de
 * `reward_grant`, SIN entrega de XP/títulos/cosméticos, SIN escritura
 * sobre inventario ni `public_profile` todavía -- eso llega en el
 * sub-incremento 1.c y en los Incrementos 2-5.
 *
 * Sub-incremento 1.c: `RewardEvaluationWorker.evaluateAccount` deja de ser
 * un no-op para la fuente `LEVEL`, entrega ÚNICAMENTE componentes
 * `XP_BONUS` -- ver docs/adr/BLOCK-III-DEFINITION.md §4.1.
 *
 * Incremento 2, sub-incremento 2.a ("Fundación de persistencia de
 * logros"): esquema y repositorios mínimos de `achievement_definition`/
 * `achievement_version` -- SIN `achievement_progress`/`achievement_unlock`
 * (dependen de la excepción controlada fijada en §4.7), SIN integración
 * con `RewardEvaluationWorker`, SIN cálculo de progreso, SIN entrega, SIN
 * exposición pública.
 *
 * Sub-incremento 2.b ("Progreso y desbloqueo de logros"): gramática
 * mínima `XP_THRESHOLD` (achievement-unlock-rule.ts, validada con Zod),
 * `achievement_progress`/`achievement_unlock` (excepción A1 aplicada),
 * integración en `RewardEvaluationWorker.evaluateAccount` -- SOLO
 * `repeatability = UNIQUE` (REPEATABLE queda fuera). Completar el umbral y
 * crear el `achievement_unlock` es una única transacción atómica
 * (precisión obligatoria del Product Owner: nunca existe `COMPLETED` sin
 * su unlock); la entrega del `reward_grant`/componentes sigue siendo
 * recuperable por separado, con capacidad de reparar la cadena si el
 * grant falta o quedan componentes `XP_BONUS` sin entregar. SIN exposición
 * pública todavía (Gate 12 se satisface aquí solo por ausencia de
 * superficie pública, no evaluado funcionalmente).
 *
 * Incremento 3, sub-incremento 3.a ("Fundación de persistencia y entrega
 * de títulos"): `title_definition`/`account_title`, entrega idempotente
 * de componentes `TITLE` reutilizando `deliverBundleComponents` (sin
 * camino paralelo) -- SIN `equipped_title`, SIN endpoints, SIN tocar
 * `public_profile` (ver 3.b).
 */
@Module({
  imports: [AuthModule, InternalOpsModule, OutboxModule],
  controllers: [GamificationController, ProgressionController],
  providers: [
    GamificationProgramRepository,
    GamificationProgramVersionRepository,
    XpRuleRepository,
    ValidatedGamificationActivityRepository,
    XpLedgerEntryRepository,
    XpBalanceRepository,
    XpGrantAttemptRepository,
    GamificationService,
    GamificationScheduler,
    XpGrantService,
    XpGrantScheduler,
    LevelDefinitionRepository,
    ProgressionService,
    RewardBundleRepository,
    RewardGrantRepository,
    RewardGrantComponentRepository,
    RewardEvaluationCursorRepository,
    RewardEvaluationWorker,
    RewardEvaluationScheduler,
    AchievementDefinitionRepository,
    AchievementVersionRepository,
    AchievementProgressRepository,
    AchievementUnlockRepository,
    TitleDefinitionRepository,
    AccountTitleRepository,
  ],
  exports: [
    GamificationProgramRepository,
    GamificationProgramVersionRepository,
    XpRuleRepository,
    ValidatedGamificationActivityRepository,
    XpLedgerEntryRepository,
    XpBalanceRepository,
    XpGrantAttemptRepository,
    GamificationService,
    XpGrantService,
    LevelDefinitionRepository,
    ProgressionService,
    RewardBundleRepository,
    RewardGrantRepository,
    RewardGrantComponentRepository,
    RewardEvaluationCursorRepository,
    AchievementDefinitionRepository,
    AchievementVersionRepository,
    AchievementProgressRepository,
    AchievementUnlockRepository,
    TitleDefinitionRepository,
    AccountTitleRepository,
  ],
})
export class GamificationModule {}
