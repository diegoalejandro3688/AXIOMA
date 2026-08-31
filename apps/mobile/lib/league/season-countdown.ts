// Lógica pura -- sin imports de RN/Expo, gateable con `tsx` puro (mismo
// criterio que `lib/league/participation-view.ts`).

export type SeasonCountdown = { ended: true } | { ended: false; label: string };

/**
 * COMPETITIVE V1 -- tiempo restante de la temporada, derivado del `endsAt`
 * que envía el servidor contra la hora del cliente.
 *
 * Reglas (§7 del handoff):
 *   - nunca cuenta regresiva negativa: `remaining <= 0` -> `{ ended: true }`
 *     (el hub renderiza el estado de temporada terminada, nunca "-2h");
 *   - `>= 1 día`  -> "6 d 12 h";
 *   - `< 1 día`   -> "18 h 32 min";
 *   - `< 1 hora`  -> "42 min" (mínimo 1).
 *
 * Precisión de minuto -- el hub refresca en el foco de pantalla / cada minuto,
 * nunca un ticker por segundo (evita churn de estado/batería).
 */
export function seasonCountdown(endsAtIso: string, now: Date = new Date()): SeasonCountdown {
  const remainingMs = new Date(endsAtIso).getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return { ended: true };

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return { ended: false, label: `${days} d ${hours} h` };
  if (hours > 0) return { ended: false, label: `${hours} h ${minutes} min` };
  return { ended: false, label: `${Math.max(1, minutes)} min` };
}
