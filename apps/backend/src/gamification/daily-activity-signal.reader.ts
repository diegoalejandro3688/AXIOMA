import { Injectable } from '@nestjs/common';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { utcDayKey } from './streak-calculator';

/**
 * Inicio (00:00 UTC) del día calendario UTC que contiene `date` -- valor
 * que se persiste en `account_challenge_daily_progress.local_date`
 * (§4.16(a)). Derivado localmente a partir de `utcDayKey` (reutilizado, no
 * duplicada la noción de "día"), sin modificar `streak-calculator.ts`
 * (Bloque II, ya cerrado y gateado).
 */
export function utcDayStart(date: Date): Date {
  const key = utcDayKey(date);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Bloque III, sub-incremento 4.b -- ver docs/adr/BLOCK-III-DEFINITION.md
 * §4.13/§4.16(a). Señal de "días activos" para desafíos, INDEPENDIENTE de
 * la racha de presentación: consulta la MISMA fuente que
 * `ProgressionService.getStreak` (`XpLedgerEntryRepository.findByAccountId`,
 * filtrando `entryType = OTORGAMIENTO`) y reutiliza `utcDayKey` de
 * `streak-calculator.ts` -- pero nunca invoca la función que calcula racha
 * de presentación. Un desafío
 * de "N días activos esta semana" no puede leer `currentStreak >= N`: esa
 * racha puede haber empezado antes del período del desafío y no representa
 * "días activos dentro de este período".
 *
 * Día calendario UTC, no zona horaria de cuenta -- mismo criterio que el
 * resto de GAMIFICATION (§4.16(a)).
 */
@Injectable()
export class DailyActivitySignalReader {
  constructor(private readonly ledgerRepo: XpLedgerEntryRepository) {}

  private async activeDayKeys(accountId: string): Promise<Set<string>> {
    const entries = await this.ledgerRepo.findByAccountId(accountId);
    const keys = entries.filter((entry) => entry.entryType === 'OTORGAMIENTO').map((entry) => utcDayKey(entry.occurredAt));
    return new Set(keys);
  }

  async hasEligibleActivity(accountId: string, localDate: Date): Promise<boolean> {
    const keys = await this.activeDayKeys(accountId);
    return keys.has(utcDayKey(localDate));
  }

  async countActiveDays(accountId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const keys = await this.activeDayKeys(accountId);
    let count = 0;
    for (const key of keys) {
      const [y, m, d] = key.split('-').map(Number) as [number, number, number];
      const dayStart = new Date(Date.UTC(y, m - 1, d));
      if (dayStart >= periodStart && dayStart < periodEnd) count++;
    }
    return count;
  }
}
