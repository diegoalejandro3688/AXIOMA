import { Injectable, Logger } from '@nestjs/common';
import { GameSeasonRepository } from './game-season.repository';
import { canonicalHorizon, type CanonicalSeasonWindow } from './season-calendar';
import {
  SEASON_HORIZON_FUTURE_WEEKS,
  SEASON_RANKING_RULE_VERSION,
  SEASON_REWARD_POLICY_VERSION,
  canonicalSeasonName,
} from './competitive-v1-config';

/** Un choque de calendario: la franja canónica está (parcialmente) ocupada por una temporada que NO es esa temporada canónica. */
export interface SeasonWindowConflict {
  readonly seasonKey: string;
  readonly canonicalStartsAt: Date;
  readonly canonicalEndsAt: Date;
  /** La(s) temporada(s) existente(s) que se solapan con la franja -- NUNCA se modifican. */
  readonly conflictingKeys: string[];
  readonly reason: 'NON_CANONICAL_SEASON_WINDOW_CONFLICT';
}

export interface ProvisionHorizonResult {
  readonly now: Date;
  readonly canonicalSlots: number;
  readonly created: string[];
  readonly existing: string[];
  readonly conflicts: SeasonWindowConflict[];
}

/**
 * PF2-B -- provisión PURA del horizonte canónico de temporadas semanales.
 *
 * `provisionHorizon(now)`:
 *   1. deriva la semana canónica actual + `SEASON_HORIZON_FUTURE_WEEKS` futuras
 *      (`season-calendar.ts`, DST-safe, contiguas por construcción)
 *   2. para cada franja: si ya existe su temporada canónica EXACTA -> nada;
 *      si la franja está ocupada por una temporada NO-canónica (legacy /
 *      wall-clock / clave distinta) -> registra un conflicto y NO crea nada
 *      en esa franja; si está libre -> crea la fila SCHEDULED
 *      (`createScheduledIfAbsent`, idempotente + concurrencia-segura)
 *   3. devuelve un resultado estructurado
 *
 * NUNCA: activa, cierra, archiva, crea grupos/participaciones, otorga
 * LP/XP/cosméticos/títulos, crea instantáneas. NUNCA modifica una fila
 * existente (ni la acorta, ni la extiende, ni la solapa).
 */
@Injectable()
export class SeasonProvisioningService {
  private readonly logger = new Logger(SeasonProvisioningService.name);

  constructor(private readonly seasonRepo: GameSeasonRepository) {}

  async provisionHorizon(now: Date = new Date()): Promise<ProvisionHorizonResult> {
    const windows = canonicalHorizon(now, SEASON_HORIZON_FUTURE_WEEKS);
    const created: string[] = [];
    const existing: string[] = [];
    const conflicts: SeasonWindowConflict[] = [];

    for (const w of windows) {
      const outcome = await this.provisionOne(w);
      if (outcome === 'created') created.push(w.seasonKey);
      else if (outcome === 'existing') existing.push(w.seasonKey);
      else conflicts.push(outcome);
    }

    if (created.length > 0 || conflicts.length > 0) {
      this.logger.log(
        `provisionHorizon: ${created.length} creada(s) [${created.join(', ')}], ${existing.length} ya presente(s), ${conflicts.length} conflicto(s) [${conflicts.map((c) => c.seasonKey).join(', ')}]`,
      );
    }
    for (const c of conflicts) {
      this.logger.error(
        `NON_CANONICAL_SEASON_WINDOW_CONFLICT -- la franja canónica ${c.seasonKey} [${c.canonicalStartsAt.toISOString()}, ${c.canonicalEndsAt.toISOString()}) está ocupada por temporada(s) no canónica(s): ${c.conflictingKeys.join(', ')}. NO se creó la fila canónica; NO se modificó ninguna fila existente. Requiere canonicalización manual (PF2-C).`,
      );
    }

    return { now, canonicalSlots: windows.length, created, existing, conflicts };
  }

  private async provisionOne(w: CanonicalSeasonWindow): Promise<'created' | 'existing' | SeasonWindowConflict> {
    // ¿Alguna temporada ya ocupa (parte de) esta franja?
    const intersecting = await this.seasonRepo.findIntersectingWindow(w.startsAt, w.endsAt);

    // Un intersecting cuya clave Y ventana son EXACTAMENTE las canónicas = la
    // propia temporada canónica (ya provisionada) -- no es un conflicto.
    const nonCanonical = intersecting.filter(
      (s) =>
        !(s.seasonKey === w.seasonKey && s.startsAt.getTime() === w.startsAt.getTime() && s.endsAt.getTime() === w.endsAt.getTime()),
    );
    if (nonCanonical.length > 0) {
      return {
        seasonKey: w.seasonKey,
        canonicalStartsAt: w.startsAt,
        canonicalEndsAt: w.endsAt,
        conflictingKeys: nonCanonical.map((s) => s.seasonKey),
        reason: 'NON_CANONICAL_SEASON_WINDOW_CONFLICT',
      };
    }

    const result = await this.seasonRepo.createScheduledIfAbsent({
      seasonKey: w.seasonKey,
      name: canonicalSeasonName(w.localStartDate),
      description: `Temporada semanal canónica -- lunes ${w.localStartDate} 00:00 America/Santiago (${w.startsAt.toISOString()}) → siguiente lunes (${w.endsAt.toISOString()})`,
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      rankingRuleVersion: SEASON_RANKING_RULE_VERSION,
      rewardPolicyVersion: SEASON_REWARD_POLICY_VERSION,
    });

    if ('windowMismatch' in result) {
      // Misma clave, ventana distinta -- conflicto duro (una fila legacy con
      // esa clave pero fechas wall-clock). Nunca se muta.
      return {
        seasonKey: w.seasonKey,
        canonicalStartsAt: w.startsAt,
        canonicalEndsAt: w.endsAt,
        conflictingKeys: [result.windowMismatch.seasonKey],
        reason: 'NON_CANONICAL_SEASON_WINDOW_CONFLICT',
      };
    }
    return result.created ? 'created' : 'existing';
  }
}
