import { Module } from '@nestjs/common';
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

/**
 * Dominio GAMIFICATION, Learning Experience Foundation -- ver
 * docs/adr/0016-gamificacion-fundacion.md y
 * docs/adr/0017-entrega-multiconsumidor-outbox.md.
 *
 * Este incremento agrega la conversión validated_gamification_activity ->
 * xp_ledger_entry mediante reglas versionadas (XpGrantService/
 * XpGrantScheduler), con xp_balance como proyección reconstruible. Sigue
 * SIN UI, niveles, rachas visibles, ligas, títulos, insignias, desafíos,
 * moneda virtual ni cosméticos.
 */
@Module({
  imports: [InternalOpsModule, OutboxModule],
  controllers: [GamificationController],
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
  ],
})
export class GamificationModule {}
