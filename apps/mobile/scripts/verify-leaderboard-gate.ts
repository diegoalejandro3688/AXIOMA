// Gate del Bloque IV, Incremento 5, sub-incremento 5.b ("Ranking móvil") --
// prueba la lógica REAL de producción (`lib/leaderboard/paginate-leaderboard.ts`)
// sin runtime de React Native, mismo criterio que verify-challenges-gate.ts.
// Incluye verificaciones ESTÁTICAS de la pantalla real (`competir/ranking.tsx`):
// cursor nunca decodificado, fila redactada sin campos presentables, doble
// toque bloqueado, ErrorState de pantalla completa solo en la carga inicial.
//
// Esto NO reemplaza la verificación manual en Browser/simulador de la
// PANTALLA (renderizado real, tema claro/oscuro, gestos, Android físico).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LeaderboardRow } from '@axioma/contracts';
import { mergeLeaderboardPages, describeMyPosition, describeZone } from '../lib/leaderboard/paginate-leaderboard';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function presentableRow(rankPosition: number, overrides: Partial<Extract<LeaderboardRow, { presentable: true }>> = {}): LeaderboardRow {
  return {
    presentable: true,
    isCurrentUser: false,
    rankPosition,
    metricValue: 1000 - rankPosition,
    competitiveZone: 'RETENTION',
    username: `user-${rankPosition}`,
    avatar: null,
    banner: null,
    equippedTitle: null,
    equippedCosmetics: [],
    levelNumber: 5,
    publicAchievements: [],
    featuredAchievements: [],
    ...overrides,
  };
}

function redactedRow(rankPosition: number, overrides: Partial<Extract<LeaderboardRow, { presentable: false }>> = {}): LeaderboardRow {
  return { presentable: false, isCurrentUser: false, rankPosition, metricValue: 1000 - rankPosition, competitiveZone: 'RETENTION', ...overrides };
}

function main() {
  console.log('--- 1. mergeLeaderboardPages: acumula, NUNCA reemplaza lo ya cargado ---');
  const page1 = [presentableRow(1), presentableRow(2), redactedRow(3)];
  const page2 = [presentableRow(4), redactedRow(5)];
  const merged = mergeLeaderboardPages(page1, page2);
  check('la página 1 sigue completa dentro del resultado', page1.every((row) => merged.some((m) => m.rankPosition === row.rankPosition)));
  check('la página 2 se añadió al final', merged.length === 5);
  check('el orden preserva la página 1 primero', merged[0].rankPosition === 1 && merged[1].rankPosition === 2);

  console.log('--- 2. Deduplicación DEFENSIVA por rankPosition -- una fila repetida no se duplica ---');
  const retryPage = [presentableRow(4, { username: 'user-4-distinto-por-error' }), presentableRow(6)];
  const mergedAfterRetry = mergeLeaderboardPages(merged, retryPage);
  check('rankPosition=4 sigue existiendo UNA sola vez (la entrante se descarta)', mergedAfterRetry.filter((r) => r.rankPosition === 4).length === 1);
  check('la fila ya presente conserva su valor ORIGINAL (username user-4, no el de la entrante descartada)', (mergedAfterRetry.find((r) => r.rankPosition === 4) as { username?: string }).username === 'user-4');
  check('rankPosition=6 (genuinamente nueva) sí se agrega', mergedAfterRetry.some((r) => r.rankPosition === 6));
  check('el total es 6 (5 + 1 genuinamente nueva, no 7)', mergedAfterRetry.length === 6);

  console.log('--- 3. describeMyPosition: null -> pending, SIN fabricar un rango ---');
  const pendingView = describeMyPosition(null);
  check('kind === pending cuando no hay proyección todavía', pendingView.kind === 'pending');

  console.log('--- 4. describeMyPosition: contexto real -> known, con leagueName/rankPosition/metricValue exactos ---');
  const knownView = describeMyPosition({
    leagueName: 'Bronce',
    leagueTier: 1,
    rankPosition: 7,
    metricValue: 340,
    competitiveZone: 'RETENTION',
    calculatedAt: '2026-08-06T00:00:00.000Z',
    snapshotVersion: 1,
  });
  check('kind === known', knownView.kind === 'known');
  check('leagueName preservado', knownView.kind === 'known' && knownView.leagueName === 'Bronce');
  check('rankPosition preservado (nunca fabricado)', knownView.kind === 'known' && knownView.rankPosition === 7);
  check('metricValue preservado (LP, se muestra junto al trofeo en la UI)', knownView.kind === 'known' && knownView.metricValue === 340);

  console.log('--- 5. Frontera estática: cursor NUNCA decodificado ni inspeccionado ---');
  const competitiveApiSource = readFileSync(join(__dirname, '..', 'lib', 'api', 'competitive.ts'), 'utf8');
  const forbiddenCursorOps = ['atob(', 'Buffer.from(cursor', 'JSON.parse(cursor', 'cursor.split', 'cursor.slice', 'cursor.charAt'];
  check('lib/api/competitive.ts no decodifica/inspecciona el cursor -- se pasa opaco', forbiddenCursorOps.every((op) => !competitiveApiSource.includes(op)));

  console.log('--- 6. Frontera estática: la pantalla real de Ranking ---');
  const rankingSource = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'competir', 'ranking.tsx'), 'utf8');

  const redactedBranchStart = rankingSource.indexOf('if (!row.presentable)');
  const redactedBranchEnd = rankingSource.indexOf('return (', rankingSource.indexOf('return (', redactedBranchStart) + 1);
  const redactedBranch = rankingSource.slice(redactedBranchStart, redactedBranchEnd);
  const forbiddenPresentableFields = ['row.username', 'row.avatar', 'row.equippedTitle', 'row.equippedCosmetics', 'row.levelNumber', 'row.publicAchievements'];
  check(
    'la rama redactada (presentable:false) no referencia ningún campo exclusivo de la fila presentable',
    forbiddenPresentableFields.every((field) => !redactedBranch.includes(field)),
  );

  check('doble-toque bloqueado: handleLoadMore verifica loadingMore antes de proceder', /if \(state\.loadingMore\) return;/.test(rankingSource));

  const errorStateOccurrences = (rankingSource.match(/<ErrorState/g) ?? []).length;
  check('ErrorState de pantalla completa aparece EXACTAMENTE una vez -- solo para el fallo de la carga INICIAL', errorStateOccurrences === 1);
  const handleLoadMoreStart = rankingSource.indexOf('async function handleLoadMore');
  const handleLoadMoreEnd = rankingSource.indexOf("if (state.status === 'loading')");
  const handleLoadMoreBody = rankingSource.slice(handleLoadMoreStart, handleLoadMoreEnd);
  check(
    'el fallo de "Ver más" NUNCA usa ErrorState -- solo setState con loadMoreError (mensaje localizado en el footer)',
    handleLoadMoreBody.includes('loadMoreError: result.message') && !handleLoadMoreBody.includes('<ErrorState'),
  );
  check('nextCursor === null oculta el control "Ver más"', rankingSource.includes('state.nextCursor !== null ?'));
  check(
    'COMPETITIVE V1 (Incremento 4): los LP se representan con el trofeo (`<LeagueTrophy`), nunca como texto "N puntos de liga" / "N LP"',
    rankingSource.includes('<LeagueTrophy') && !rankingSource.includes('puntos de liga') && !/\bmetricValue\}\s*LP\b/.test(rankingSource),
  );

  console.log('--- 6b. COMPETITIVE V1 (rediseño visual, Incremento 4): identidad coherente con la tarjeta de Liga ---');
  check('tarjeta superior "TU POSICIÓN" con escudo real de la liga', rankingSource.includes('TU POSICIÓN') && rankingSource.includes('<LeagueEmblem') && rankingSource.includes('tier={ctx.leagueTier}'));
  check('acento/tinte MUY sutil de `leagueVisual(ctx.leagueTier, scheme)` -- misma identidad que la Liga card', rankingSource.includes('leagueVisual(ctx.leagueTier, scheme)'));
  check('rango propio: "#N" real o "Actualizando posición…", NUNCA #0', rankingSource.includes('#{myPosition.rankPosition}') && rankingSource.includes('Actualizando posición') && !/#\{?0\}/.test(rankingSource));
  check('la ZONA de la tarjeta superior sale de `ctx.competitiveZone` del backend -- nunca calculada', rankingSource.includes('ctx.competitiveZone') && !/computeZoneCounts|resolveCompetitiveZone|parseTopPercent|parseBottomPercent/.test(rankingSource));
  check('las tres zonas de la tarjeta superior tienen copy (ascenso / permanencia / descenso)', /Zona de ascenso/.test(rankingSource) && /Zona de permanencia/.test(rankingSource) && /Zona de descenso/.test(rankingSource));
  const topThreeStyle = rankingSource.slice(rankingSource.indexOf('rowTopThree: {'), rankingSource.indexOf('}', rankingSource.indexOf('rowTopThree: {')));
  check(
    'Top 3 con más presencia visual, gateado por `row.rankPosition <= 3`, con acento SOBRIO (accent, NUNCA oro/warning por ser #1)',
    rankingSource.includes('row.rankPosition <= 3') && topThreeStyle.includes('accent') && !topThreeStyle.includes('warning') && !/gold|dorado/i.test(topThreeStyle),
  );
  check('resalte del usuario actual: badge "Tú" además del borde', rankingSource.includes('youBadge') && /['"]Tú['"]|>\s*Tú\s*</.test(rankingSource));
  check('las filas 4+ usan trofeo pequeño + metricValue (`RowLp`)', rankingSource.includes('function RowLp') && rankingSource.includes('<RowLp value={row.metricValue}'));

  console.log('--- 7. COMPETITIVE V1: zonas EN VIVO (§15/§36) -- ascenso/descenso con insignia, retención neutra ---');
  check('describeZone(PROMOTION) -> insignia "promotion" con etiqueta "Ascenso"', (() => { const b = describeZone('PROMOTION'); return b?.kind === 'promotion' && b.label === 'Ascenso'; })());
  check('describeZone(DEMOTION) -> insignia "demotion" con etiqueta "Descenso"', (() => { const b = describeZone('DEMOTION'); return b?.kind === 'demotion' && b.label === 'Descenso'; })());
  check('describeZone(RETENTION) -> null (fila neutra, sin insignia)', describeZone('RETENTION') === null);
  check('la pantalla usa la ZONA que decide el backend (`competitiveZone`), nunca la deriva del rank', rankingSource.includes('row.competitiveZone') && !/rankPosition <= 6|rankPosition > 24|1.{0,3}6.{0,3}promo/i.test(rankingSource));
  check('el indicador de zona (ZoneIndicator) se renderiza en la fila presentable Y en la redactada', (rankingSource.match(/<ZoneIndicator /g) ?? []).length >= 2);
  check('el resalte del usuario actual (isCurrentUser) sigue presente', rankingSource.includes('row.isCurrentUser') && rankingSource.includes('rowHighlighted'));
  check('la fila redactada sigue sin navegar (sin Pressable/onPress en su rama)', !redactedBranch.includes('Pressable') && !redactedBranch.includes('onPress'));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Ranking (móvil, Bloque IV Incremento 5, sub-incremento 5.b) pasaron.');
}

main();
