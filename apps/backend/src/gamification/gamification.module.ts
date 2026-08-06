import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EducationModule } from '../education/education.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { ObjectStorageModule } from '../platform/object-storage/object-storage.module';
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
import { EquippedTitleRepository } from './equipped-title.repository';
import { TitleEquipmentService } from './title-equipment.service';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { AccountChallengeRepository } from './account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from './account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from './account-challenge-consumed-event.repository';
import { DailyActivitySignalReader } from './daily-activity-signal.reader';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { CosmeticItemRepository } from './cosmetic-item.repository';
import { InventoryItemRepository } from './inventory-item.repository';
import { EquippedCosmeticRepository } from './equipped-cosmetic.repository';
import { CosmeticEquipmentService } from './cosmetic-equipment.service';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueDefinitionRepository } from './league-definition.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { LeaguePointRuleRepository } from './league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from './league-point-ledger-entry.repository';
import { LeagueEnrollmentService } from './league-enrollment.service';
import { LeagueParticipationController } from './league-participation.controller';
import { LeaguePointGrantService } from './league-point-grant.service';
import { LeaguePointGrantScheduler } from './league-point-grant.scheduler';
import { SeasonTransitionService } from './season-transition.service';
import { SeasonTransitionScheduler } from './season-transition.scheduler';
import { LeaderboardDefinitionRepository } from './leaderboard-definition.repository';
import { LeaderboardEntryRepository } from './leaderboard-entry.repository';
import { LeaderboardSnapshotRepository } from './leaderboard-snapshot.repository';
import { LeaderboardSnapshotEntryRepository } from './leaderboard-snapshot-entry.repository';
import { LeaderboardCalculationService } from './leaderboard-calculation.service';
import { LeaderboardCalculationScheduler } from './leaderboard-calculation.scheduler';
import { LeaderboardFinalizationService } from './leaderboard-finalization.service';
import { LeaderboardFinalizationScheduler } from './leaderboard-finalization.scheduler';
import { QuickQuestionSessionRepository } from './quick-question-session.repository';
import { QuickQuestionAttemptRepository } from './quick-question-attempt.repository';
import { QuickQuestionService } from './quick-question.service';
import { QuickQuestionController } from './quick-question.controller';

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
 *
 * Sub-incremento 3.b ("Equipamiento de títulos"): `equipped_title` +
 * `TitleEquipmentService` (exportado -- `UserModule` lo consume para el
 * endpoint de autoservicio, mismo criterio de frontera que
 * `PrivacyModule` llamando a `UserService`, nunca repositorios ajenos
 * directamente). Consistencia (cuenta, propiedad activa, definición
 * activa/pública, perfil `ACTIVE`) respaldada por trigger -- Gates 13-15.
 *
 * Incremento 4, sub-incremento 4.a ("Fundación de persistencia de
 * desafíos"): esquema y repositorios mínimos de `challenge_definition`/
 * `account_challenge`/`account_challenge_daily_progress` -- SIN evaluación
 * de eventos, SIN progresión, SIN reclamación de recompensa, SIN
 * integración con `RewardEvaluationWorker` (sub-incrementos posteriores).
 * Ciclo de vida de `account_challenge` (Gate 17) y tope diario (§4.12,
 * schema-level) respaldados por trigger.
 *
 * Sub-incremento 4.b ("Consumo de eventos y progresión de desafíos", §4.16):
 * `RewardEvaluationWorker.evaluateChallenges` consume `pendingEntries`
 * (`OTORGAMIENTO`), con deduplicación por evento
 * (`AccountChallengeConsumedEventRepository`), tope diario real (día
 * calendario UTC) y progresión `ACCEPTED -> IN_PROGRESS -> COMPLETED` --
 * `CLAIMED`, endpoints y superficie móvil quedan fuera. `DailyActivitySignalReader`
 * (gramática `hasEligibleActivity`/`countActiveDays`, Gate 33) se gatea de
 * forma independiente -- no lo invoca el worker en 4.b (los desafíos de
 * "días activos" usan el mismo mecanismo genérico con `daily_cap = 1`).
 *
 * Sub-incremento 4.c ("Reclamación explícita", §4.17): `ChallengeService`/
 * `ChallengeController` (`/gamification/me/challenges`) -- únicamente
 * `COMPLETED -> CLAIMED`, reutilizando `RewardEvaluationWorker.deliverBundleComponents`
 * (visibilidad ampliada a pública) con fuente `CHALLENGE_CLAIM`. Superficie
 * móvil diferida a 4.d.
 *
 * Incremento 5, sub-incremento 5.a ("Fundación de persistencia y entrega
 * de cosméticos", §4.19): `cosmetic_item`/`inventory_item`, entrega
 * idempotente de componentes `COSMETIC` vía `RewardEvaluationWorker.deliverCosmeticComponent`
 * (mismo mecanismo genérico, sin camino paralelo) -- SIN `equipped_cosmetic`,
 * SIN endpoints, SIN superficie móvil (ver 5.b/5.c). Propiedad `REVOKED`/
 * `SUPERSEDED` nunca se reactiva silenciosamente ante una nueva entrega.
 *
 * Sub-incremento 5.b ("Equipamiento de cosméticos", §4.20):
 * `equipped_cosmetic` + `CosmeticEquipmentService` (exportado --
 * `UserModule` lo consume para el endpoint de autoservicio en
 * `gamification/me/cosmetics`, mismo criterio de frontera que
 * `TitleEquipmentService`: la ruta HTTP vive en `UserModule` para evitar
 * una dependencia circular de módulos, sin que `GamificationModule`
 * importe `UserModule`). Consistencia (cuenta, propiedad activa, perfil
 * `ACTIVE`, Y coincidencia tipo-slot) respaldada por trigger -- Gates
 * 22/34/59-63/66.
 *
 * Bloque IV, Incremento 1 ("Fundación de temporadas y ligas") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9. `game_season`/`league_definition`/
 * `league_group`/`season_league_participation` (materialización perezosa de
 * grupo+participación bajo advisory lock, namespace 21, distinto de 19/20) y
 * `league_point_rule`/`league_point_ledger_entry` (ledger de League Points
 * INDEPENDIENTE de `xp_ledger_entry`, nunca una vista derivada ni una
 * transacción compartida). `LeagueEnrollmentService`/`LeaguePointGrantService`/
 * `SeasonTransitionService` -- SIN ranking, SIN endpoints, SIN superficie
 * móvil (Incrementos 2-5). Transiciones de estado (temporada/grupo/
 * participación) forward-only por trigger; ventana de elegibilidad sin
 * retroactividad y exclusión otorgamiento-vs-cierre respaldadas también por
 * trigger (`enforce_league_point_ledger_entry_window`), no solo por la
 * relectura SERIALIZABLE de la aplicación.
 *
 * Bloque IV, Incremento 2 ("Ranking") -- ver
 * docs/adr/0020-ranking-materializacion.md (APPROVED, cinco precisiones
 * obligatorias del Product Owner) y docs/adr/LEF-BLOCK-IV-DEFINITION.md §10.
 * `leaderboard_definition`/`leaderboard_entry` (proyección materializada,
 * identidad autoritativa `seasonLeagueParticipationId` -- NUNCA
 * `publicProfileId`, que queda `null` y se resuelve en Incremento 3) +
 * `leaderboard_snapshot`/`leaderboard_snapshot_entry` (instantánea inmutable
 * al cierre, sin ninguna columna mutable). `LeaderboardCalculationService`
 * calcula y persiste el ranking de un grupo (`LeaderboardCalculationScheduler`,
 * cada 15 min, SOLO grupos OPEN/FULL de la temporada ACTIVE -- sin recálculo
 * bajo demanda del cliente). `LeaderboardFinalizationService`
 * (`LeaderboardFinalizationScheduler`, cada minuto) cierra todo grupo
 * `LOCKED` sin instantánea final: último recálculo, gramática `top/bottom
 * N%` (mínimo 3 participantes, tiers extremos resueltos a `RETAINED`),
 * snapshot `FINAL`, transición `SEASON_ENDED -> {PROMOTED,DEMOTED,RETAINED}`
 * -- advisory lock namespace 22 (distinto de 19/20/21) protege el cierre de
 * un mismo grupo contra reintentos concurrentes (idempotente). La
 * visibilidad de perfil NUNCA excluye ni altera el cálculo (ADR-0020 §1/§2)
 * -- toda `season_league_participation` de un grupo obtiene su fila real,
 * sin excepción. SIN endpoints, SIN superficie móvil (Incrementos 3/5).
 *
 * Bloque IV, Incremento 4, sub-incremento 4.a ("Fundación de persistencia
 * de Pregunta rápida") -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §12-13.
 * `quick_question_session`/`quick_question_attempt` -- entidades PROPIAS y
 * MÍNIMAS (decisión confirmada del Product Owner, §12.8), NO el framework
 * genérico `competition_definition`/`competition_instance`/`competition_result`
 * del Data Model. Máquina de estados forward-only (`ACTIVE -> CLOSED`) y
 * "sesión cerrada no acepta nuevas respuestas" respaldadas por trigger
 * (`enforce_quick_question_session_status_transition`/
 * `enforce_quick_question_attempt_session_active`). SIN selección de
 * preguntas, SIN corrección, SIN transacción de negocio, SIN publicación de
 * evento, SIN HTTP (sub-incremento 4.b/4.c) -- únicamente esquema,
 * migración, triggers y los dos repositorios mínimos.
 *
 * Sub-incremento 4.b ("Motor de sesión") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.2-13.3. `QuickQuestionService`:
 * selección server-side (`QuestionVersionRepository.findRandomEligible`,
 * EDUCATION, importado vía `EducationModule` -- mismo criterio que
 * `ProgressModule`), corrección reutilizando `AnswerOptionRepository`
 * (EDUCATION), advisory lock namespace 23 (distinto de 19/20/21/22) con
 * exclusión mutua compartida entre `next`/`answer`/`close` por sesión,
 * apertura idempotente de sesión por cuenta (índice único parcial +
 * relectura bajo lock), publicación best-effort post-commit de
 * `quick_question_answered` (ADR-0006).
 *
 * Sub-incremento 4.c ("Endpoints HTTP") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.4. `QuickQuestionController`
 * (`/gamification/me/quick-question/sessions`): `POST /` (abrir/reutilizar),
 * `POST /:sessionId/next`, `POST /:sessionId/answers`, `POST /:sessionId/close`
 * -- cada uno solo traduce entrada/salida sobre `QuickQuestionService`
 * (4.b), sin lógica de dominio nueva. `200` uniforme en las cuatro rutas
 * (precisión obligatoria del Product Owner). `ObjectStorageModule`
 * importado para resolver bloques `image` de `stemContent`/
 * `explanationContent` a URL firmada, mismo criterio que `EducationService`
 * -- Pregunta rápida reutiliza contenido de EDUCATION que puede incluirlas.
 *
 * Bloque IV, Incremento 5, sub-incremento 5.a ("Enrolamiento real +
 * wrappers API + hub de navegación") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md, auditoría previa a Incremento 5.
 * `LeagueParticipationController` (`/gamification/me/league/participation`):
 * `GET` (lectura pura, NUNCA crea -- ENROLLED/NOT_ENROLLED/NO_ACTIVE_SEASON)
 * y `POST` (acción idempotente, ENROLLED/NO_ACTIVE_SEASON). Resuelve el
 * hueco real encontrado en la auditoría: `LeagueEnrollmentService.joinActiveSeason`
 * (Incremento 1) nunca tenía disparador HTTP -- ninguna cuenta real podía
 * inscribirse. Deliberadamente NO conectado a `XpGrantService` ni a ningún
 * otorgamiento automático (decisión del Product Owner) -- acción explícita
 * de autoservicio únicamente. Sin `leaguePoints` en el contrato -- el saldo
 * y la posición siguen perteneciendo a los endpoints competitivos ya
 * existentes (Incremento 3).
 */
@Module({
  imports: [AuthModule, EducationModule, InternalOpsModule, ObjectStorageModule, OutboxModule],
  controllers: [GamificationController, ProgressionController, ChallengeController, QuickQuestionController, LeagueParticipationController],
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
    EquippedTitleRepository,
    TitleEquipmentService,
    ChallengeDefinitionRepository,
    AccountChallengeRepository,
    AccountChallengeDailyProgressRepository,
    AccountChallengeConsumedEventRepository,
    DailyActivitySignalReader,
    ChallengeService,
    CosmeticItemRepository,
    InventoryItemRepository,
    EquippedCosmeticRepository,
    CosmeticEquipmentService,
    GameSeasonRepository,
    LeagueDefinitionRepository,
    LeagueGroupRepository,
    SeasonLeagueParticipationRepository,
    LeaguePointRuleRepository,
    LeaguePointLedgerEntryRepository,
    LeagueEnrollmentService,
    LeaguePointGrantService,
    LeaguePointGrantScheduler,
    SeasonTransitionService,
    SeasonTransitionScheduler,
    LeaderboardDefinitionRepository,
    LeaderboardEntryRepository,
    LeaderboardSnapshotRepository,
    LeaderboardSnapshotEntryRepository,
    LeaderboardCalculationService,
    LeaderboardCalculationScheduler,
    LeaderboardFinalizationService,
    LeaderboardFinalizationScheduler,
    QuickQuestionSessionRepository,
    QuickQuestionAttemptRepository,
    QuickQuestionService,
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
    EquippedTitleRepository,
    TitleEquipmentService,
    ChallengeDefinitionRepository,
    AccountChallengeRepository,
    AccountChallengeDailyProgressRepository,
    AccountChallengeConsumedEventRepository,
    DailyActivitySignalReader,
    ChallengeService,
    CosmeticItemRepository,
    InventoryItemRepository,
    EquippedCosmeticRepository,
    CosmeticEquipmentService,
    GameSeasonRepository,
    LeagueDefinitionRepository,
    LeagueGroupRepository,
    SeasonLeagueParticipationRepository,
    LeaguePointRuleRepository,
    LeaguePointLedgerEntryRepository,
    LeaderboardDefinitionRepository,
    LeaderboardEntryRepository,
    LeaderboardSnapshotRepository,
    LeaderboardCalculationService,
    QuickQuestionSessionRepository,
    QuickQuestionAttemptRepository,
  ],
})
export class GamificationModule {}
