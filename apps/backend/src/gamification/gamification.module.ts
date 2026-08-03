import { Module } from '@nestjs/common';
import { GamificationProgramRepository } from './gamification-program.repository';
import { GamificationProgramVersionRepository } from './gamification-program-version.repository';
import { XpRuleRepository } from './xp-rule.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { XpBalanceRepository } from './xp-balance.repository';

/**
 * Dominio GAMIFICATION, Bloque I (Learning Experience Foundation) -- ver
 * docs/adr/0016-gamificacion-fundacion.md. Solo persistencia en este
 * incremento: sin controller (no hay endpoint todavía), sin productor,
 * sin GamificationRelayWorker, sin cálculo de XP.
 */
@Module({
  providers: [
    GamificationProgramRepository,
    GamificationProgramVersionRepository,
    XpRuleRepository,
    ValidatedGamificationActivityRepository,
    XpLedgerEntryRepository,
    XpBalanceRepository,
  ],
  exports: [
    GamificationProgramRepository,
    GamificationProgramVersionRepository,
    XpRuleRepository,
    ValidatedGamificationActivityRepository,
    XpLedgerEntryRepository,
    XpBalanceRepository,
  ],
})
export class GamificationModule {}
