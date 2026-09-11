/**
 * WEB-0D.1B-P0B1 -- minimización central del payload persistido en
 * `analytics_event`. ADR-0006 §"Payload mínimo" ya declara el principio
 * ("únicamente la información estrictamente necesaria para el análisis
 * declarado -- nunca un DTO completo, nunca PII") y §"Pseudonimización
 * mínima" ya deja explícito que `analyticsActorRef` -- nunca el `accountId`
 * crudo -- es el identificador de actor persistido. Lo que faltaba: el
 * `accountId` validado por el esquema Zod del payload (necesario de forma
 * TRANSITORIA para derivar `analyticsActorRef`, ver `AnalyticsService.
 * ingestOne`) también quedaba, sin querer, dentro del `payload` JSON
 * persistido -- el mismo dato crudo que la pseudonimización existe
 * justamente para no guardar.
 *
 * `omitAccountId` es el ÚNICO punto donde se decide qué persiste --
 * `AnalyticsService.ingestOne` la aplica SIEMPRE, sin que cada productor de
 * eventos tenga que recordar excluir `accountId` de su propio payload
 * (fail-safe: un esquema de evento futuro que declare `accountId` +
 * cualquier otro campo de negocio nunca vuelve a filtrar el crudo -- los
 * demás campos sobreviven intactos).
 */
export function omitAccountId<T extends Record<string, unknown>>(payload: T): Omit<T, 'accountId'> {
  const { accountId: _accountId, ...rest } = payload;
  return rest;
}
