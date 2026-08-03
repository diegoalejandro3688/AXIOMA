import { Module } from '@nestjs/common';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { GamificationProgramRepository } from './gamification-program.repository';
import { GamificationProgramVersionRepository } from './gamification-program-version.repository';
import { XpRuleRepository } from './xp-rule.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { XpBalanceRepository } from './xp-balance.repository';
import { GamificationService } from './gamification.service';
import { GamificationScheduler } from './gamification.scheduler';
import { GamificationController } from './gamification.controller';

/**
 * Dominio GAMIFICATION, Learning Experience Foundation -- ver
 * docs/adr/0016-gamificacion-fundacion.md y
 * docs/adr/0017-entrega-multiconsumidor-outbox.md.
 *
 * Este incremento agrega el relay (outbox_event -> validated_gamification_activity)
 * sobre la persistencia del incremento anterior. Sigue SIN cálculo de XP:
 * xp_ledger_entry y xp_balance permanecen sin ningún escritor real.
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
    GamificationService,
    GamificationScheduler,
  ],
  exports: [
    GamificationProgramRepository,
    GamificationProgramVersionRepository,
    XpRuleRepository,
    ValidatedGamificationActivityRepository,
    XpLedgerEntryRepository,
    XpBalanceRepository,
    GamificationService,
  ],
})
export class GamificationModule {}
