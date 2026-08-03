import { Injectable } from '@nestjs/common';
import { XpBalanceRepository } from './xp-balance.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { LevelDefinitionRepository } from './level-definition.repository';
import { computeStreak, type StreakResult } from './streak-calculator';
import type { XpLedgerEntry } from '../generated/prisma/client';

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 200;

export interface LevelSummary {
  levelNumber: number;
  levelName: string | null;
  minimumLifetimeXp: number;
}

export interface LevelProgress {
  lifetimeXp: number;
  currentLevel: LevelSummary;
  nextLevel: LevelSummary | null;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progressRatio: number;
}

export interface XpHistoryEntry {
  id: string;
  entryType: XpLedgerEntry['entryType'];
  xpAmount: number;
  reasonCode: string | null;
  occurredAt: Date;
}

export interface XpHistoryPage {
  entries: XpHistoryEntry[];
  nextCursor: string | null;
}

/**
 * Servicio de lectura del incremento "Progresión visible" (Bloque II) --
 * ver docs/adr/BLOCK-II-DEFINITION.md. Consume EXCLUSIVAMENTE tablas ya
 * propiedad de GAMIFICATION (`xp_balance`, `xp_ledger_entry`,
 * `level_definition`) -- nunca las entidades académicas propias de PROGRESS
 * (Decision Gate 2, heredado del Bloque I). No escribe nada: es
 * exclusivamente de lectura, no modifica `XpGrantService` ni sus
 * invariantes.
 */
@Injectable()
export class ProgressionService {
  constructor(
    private readonly xpBalanceRepository: XpBalanceRepository,
    private readonly xpLedgerEntryRepository: XpLedgerEntryRepository,
    private readonly levelDefinitionRepository: LevelDefinitionRepository,
  ) {}

  async getLevelProgress(accountId: string): Promise<LevelProgress> {
    const [balance, levels] = await Promise.all([
      this.xpBalanceRepository.findByAccountId(accountId),
      this.levelDefinitionRepository.findAllActiveOrderedByLevelNumber(),
    ]);

    const lifetimeXp = balance?.lifetimeXp ?? 0;

    // Invariante garantizada por el seed de este incremento: siempre existe
    // al menos un nivel ACTIVO con minimumLifetimeXp = 0 (nivel 1) -- toda
    // cuenta, incluso sin XP, tiene un nivel actual válido.
    let currentIndex = 0;
    for (let i = 0; i < levels.length; i++) {
      if (levels[i]!.minimumLifetimeXp <= lifetimeXp) {
        currentIndex = i;
      } else {
        break;
      }
    }

    const currentLevel = toLevelSummary(levels[currentIndex]!);
    const nextLevelDefinition = levels[currentIndex + 1] ?? null;
    const nextLevel = nextLevelDefinition ? toLevelSummary(nextLevelDefinition) : null;

    const xpIntoLevel = lifetimeXp - currentLevel.minimumLifetimeXp;
    const xpForNextLevel = nextLevel ? nextLevel.minimumLifetimeXp - currentLevel.minimumLifetimeXp : null;
    const progressRatio = nextLevel && xpForNextLevel! > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel!) : 1;

    return { lifetimeXp, currentLevel, nextLevel, xpIntoLevel, xpForNextLevel, progressRatio };
  }

  async getStreak(accountId: string): Promise<StreakResult> {
    const entries = await this.xpLedgerEntryRepository.findByAccountId(accountId);
    const grantOccurredAtDates = entries.filter((entry) => entry.entryType === 'OTORGAMIENTO').map((entry) => entry.occurredAt);
    return computeStreak(grantOccurredAtDates);
  }

  async getXpHistory(accountId: string, options: { limit?: number; before?: string } = {}): Promise<XpHistoryPage> {
    const limit = Math.min(options.limit ?? DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
    const beforeRecordedAt = options.before ? new Date(options.before) : undefined;

    const entries = await this.xpLedgerEntryRepository.findByAccountIdPaginated(accountId, { limit, beforeRecordedAt });

    const nextCursor = entries.length === limit ? entries[entries.length - 1]!.recordedAt.toISOString() : null;

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        xpAmount: entry.xpAmount,
        reasonCode: entry.reasonCode,
        occurredAt: entry.occurredAt,
      })),
      nextCursor,
    };
  }
}

function toLevelSummary(level: { levelNumber: number; levelName: string | null; minimumLifetimeXp: number }): LevelSummary {
  return { levelNumber: level.levelNumber, levelName: level.levelName, minimumLifetimeXp: level.minimumLifetimeXp };
}
