import { BadRequestException } from '@nestjs/common';

/**
 * Bloque IV, Incremento 3, sub-incremento 3.c (ADR-0021, precisión
 * obligatoria del Product Owner 2026-08-06: "el cursor HTTP debe ser
 * opaco. No expongas leaderboardEntryId, groupId, accountId,
 * publicProfileId ni seasonLeagueParticipationId") -- el cursor codifica
 * EXCLUSIVAMENTE `rankPosition` (un entero ya público, expuesto en cada
 * fila de la propia respuesta) -- ninguno de los cinco identificadores
 * prohibidos existe siquiera dentro del cursor, codificado o no. Base64
 * únicamente para que el valor sea una cadena opaca de tránsito (no una
 * URL con un número plano) -- no es un mecanismo de seguridad, no hace
 * falta que lo sea: no hay nada sensible que ocultar dentro.
 */
export function encodeLeaderboardCursor(afterRankPosition: number): string {
  return Buffer.from(JSON.stringify({ r: afterRankPosition }), 'utf-8').toString('base64url');
}

/** Lanza `BadRequestException` ante cualquier cursor malformado -- nunca deja pasar un valor no numérico a la consulta. */
export function decodeLeaderboardCursor(cursor: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    throw new BadRequestException('Cursor inválido.');
  }
  if (typeof parsed !== 'object' || parsed === null || !('r' in parsed) || typeof (parsed as { r: unknown }).r !== 'number') {
    throw new BadRequestException('Cursor inválido.');
  }
  const afterRankPosition = (parsed as { r: number }).r;
  if (!Number.isInteger(afterRankPosition) || afterRankPosition < 0) {
    throw new BadRequestException('Cursor inválido.');
  }
  return afterRankPosition;
}
