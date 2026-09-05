// STABILIZATION-B7 -- salvaguarda de aislamiento COMPARTIDA para todo gate
// capaz de mutar estado de liga/temporada.
//
// B5A demostró que `run-gate.ts` NO basta como única barrera: un gate
// invocado DIRECTAMENTE (`tsx scripts/verify-league-participation-gate.ts`)
// se saltó el wrapper y una "higiene" de la forma
//   UPDATE game_season SET status='FINALIZED' WHERE status='ACTIVE'
// FINALIZÓ la temporada real `comp-v1-2026-08-31` sobre `axioma_dev` ~2 días
// antes de tiempo.
//
// Dos defensas, independientes:
//
//   1. `assertGateDb(pg)` -- HARD FAIL (exit 1) ANTES de la primera
//      escritura si `current_database()` es `axioma_dev`. Cada gate de liga
//      lo llama como primer paso tras conectar, se invoque como se invoque.
//
//   2. `finalizeStaleGateSeasons` / `retireStaleGateLeagues` -- higiene
//      NAMESPACED: sólo tocan filas cuyo `*_key` termina en una marca de
//      tiempo epoch (>=10 dígitos), la forma que TODOS los fixtures de gate
//      generan (`${Date.now()}` / `${suffix}`). Una temporada/ liga real
//      (`comp-v1-2026-08-31`, `bronce`, ...) NUNCA coincide con ese patrón,
//      así que estas funciones no pueden alterarla aunque, por un fallo de
//      la defensa 1, se ejecutasen sobre `axioma_dev`.

/** Cliente `pg.Client` (o cualquier objeto con `.query`). */
export interface QueryableClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}

const FORBIDDEN_DB_NAME = 'axioma_dev';

/**
 * Marca de fixture de gate: el `*_key` termina en `-` seguido de >=10
 * dígitos (epoch ms = 13). `comp-v1-2026-08-31` -> termina en `-31` (2
 * dígitos) -> NO coincide. `lpg-season-1788581651486` -> coincide.
 */
export const GATE_FIXTURE_KEY_SQL_REGEX = '-[0-9]{10,}$';

/**
 * HARD FAIL si el gate está apuntando a `axioma_dev`. Llamar SIEMPRE como
 * primer paso tras `pg.connect()` (y antes de instanciar servicios que
 * escriban). Devuelve el nombre de la base para logging.
 */
export async function assertGateDb(pg: QueryableClient): Promise<string> {
  const result = await pg.query('SELECT current_database() AS d');
  return assertNotDevDbName(String(result.rows[0]?.d ?? ''));
}

/**
 * Igual que `assertGateDb` pero para gates que sólo tienen un cliente Prisma
 * (sin `pg.Client`). Llamar como primer paso.
 */
export async function assertGateDbViaPrisma(prisma: {
  $queryRawUnsafe: <T>(q: string) => Promise<T>;
}): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ d: string }>>('SELECT current_database() AS d');
  return assertNotDevDbName(String(rows[0]?.d ?? ''));
}

function assertNotDevDbName(dbName: string): string {
  if (dbName === FORBIDDEN_DB_NAME) {
    console.error(
      `\nFALLO DE AISLAMIENTO DE GATE -- este gate resolvió a la base "${dbName}" (la base real de Android/desarrollo).\n` +
        'Un gate de liga NUNCA debe escribir sobre axioma_dev. Ejecútalo vía `pnpm run verify:<gate>` (run-gate.ts), no directamente.\n',
    );
    process.exit(1);
  }
  console.log(`[gate-db-safety] Base de datos = "${dbName}" (no "${FORBIDDEN_DB_NAME}").`);
  return dbName;
}

/**
 * Higiene entre corridas NAMESPACED: finaliza SÓLO las temporadas ACTIVE
 * que son fixtures de gate (`season_key` con marca epoch). Reemplaza al
 * antiguo `WHERE status='ACTIVE'` sin filtro. Devuelve cuántas filas tocó.
 */
export async function finalizeStaleGateSeasons(pg: QueryableClient): Promise<number> {
  const result = await pg.query(
    `UPDATE game_season SET status = 'FINALIZED', finalized_at = now()
     WHERE status = 'ACTIVE' AND season_key ~ '${GATE_FIXTURE_KEY_SQL_REGEX}'`,
  );
  return result.rowCount ?? 0;
}

/**
 * Higiene entre corridas NAMESPACED: retira SÓLO las ligas ACTIVE que son
 * fixtures de gate (`league_key` con marca epoch), opcionalmente
 * excluyendo una (la que la corrida actual quiere mantener como tier más
 * bajo/medio). Reemplaza al antiguo `WHERE league_key != X AND status='ACTIVE'`,
 * que retiraba también las 7 ligas productivas.
 */
/**
 * Retira TODA liga ACTIVE cuyo `league_key` no esté en `keepKeys`. A
 * diferencia de `retireStaleGateLeagues`, SÍ toca las 7 ligas productivas
 * -- necesario para gates que ejercitan `findLowestActiveTier` /
 * `findAdjacentActiveTier` y necesitan un ladder de tiers limpio y
 * determinista (sus tiers-fixture colisionan en `tierOrder` con las reales).
 *
 * SEGURO SÓLO porque `assertGateDb` YA hizo HARD FAIL si la base era
 * `axioma_dev`: en la base de gates dedicada, retirar las ligas seed y
 * recrearlas por corrida es higiene legítima. NUNCA llamar sin haber
 * llamado antes a `assertGateDb`.
 */
export async function retireOtherActiveLeagues(pg: QueryableClient, keepKeys: string[]): Promise<number> {
  const result = await pg.query(
    `UPDATE league_definition SET status = 'RETIRED', retired_at = now()
     WHERE status = 'ACTIVE' AND league_key <> ALL($1)`,
    [keepKeys],
  );
  return result.rowCount ?? 0;
}

export async function retireStaleGateLeagues(pg: QueryableClient, keep?: string | string[]): Promise<number> {
  const keepKeys = keep == null ? [] : Array.isArray(keep) ? keep : [keep];
  const params: unknown[] = [];
  let sql = `UPDATE league_definition SET status = 'RETIRED', retired_at = now()
             WHERE status = 'ACTIVE' AND league_key ~ '${GATE_FIXTURE_KEY_SQL_REGEX}'`;
  if (keepKeys.length > 0) {
    params.push(keepKeys);
    sql += ` AND league_key <> ALL($1)`;
  }
  const result = await pg.query(sql, params);
  return result.rowCount ?? 0;
}
