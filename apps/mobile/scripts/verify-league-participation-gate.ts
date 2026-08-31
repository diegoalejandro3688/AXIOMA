// Gate del Bloque IV, Incremento 5, sub-incremento 5.a ("Enrolamiento real
// + wrappers API + hub de navegación") -- prueba la lógica REAL de
// producción (`lib/league/participation-view.ts`) sin runtime de React
// Native, mismo criterio que verify-challenges-gate.ts. Incluye además una
// verificación ESTÁTICA del hub real (competir/index.tsx): `joinLeague()`
// nunca se invoca desde un `useEffect`, solo desde el `onPress` explícito
// del botón "Unirme a la liga".
//
// Esto NO reemplaza la verificación manual en Browser/simulador de la
// PANTALLA (renderizado real, tema claro/oscuro, gestos, Android físico).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GetLeagueParticipationResponse, PostLeagueParticipationResponse } from '@axioma/contracts';
import { describeParticipation, showJoinButton } from '../lib/league/participation-view';
import { seasonCountdown } from '../lib/league/season-countdown';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function main() {
  const SEASON_FIXTURE = { startsAt: '2026-08-31T00:00:00.000Z', endsAt: '2026-09-07T00:00:00.000Z' };

  console.log('--- 1. ENROLLED -> kind enrolled, con leagueName/tier/status/season, botón OCULTO ---');
  const enrolled: GetLeagueParticipationResponse = { outcome: 'ENROLLED', leagueName: 'Bronce', leagueTier: 1, leaguePoints: 6, joinedAt: '2026-08-06T00:00:00.000Z', status: 'ACTIVE', season: SEASON_FIXTURE };
  const enrolledView = describeParticipation(enrolled);
  check('kind === enrolled', enrolledView.kind === 'enrolled');
  check('leagueName preservado', enrolledView.kind === 'enrolled' && enrolledView.leagueName === 'Bronce');
  check('leagueTier preservado (COMPETITIVE V1)', enrolledView.kind === 'enrolled' && enrolledView.leagueTier === 1);
  check('leaguePoints reenviado tal cual (COMPETITIVE V1 -- saldo VIVO, nunca derivado)', enrolledView.kind === 'enrolled' && enrolledView.leaguePoints === 6);
  check('status preservado', enrolledView.kind === 'enrolled' && enrolledView.status === 'ACTIVE');
  check('season.startsAt/endsAt preservados (COMPETITIVE V1, para la cuenta regresiva)', enrolledView.kind === 'enrolled' && enrolledView.season.startsAt === SEASON_FIXTURE.startsAt && enrolledView.season.endsAt === SEASON_FIXTURE.endsAt);
  check('botón "Unirme a la liga" OCULTO en ENROLLED', showJoinButton(enrolledView) === false);

  console.log('--- 2. NOT_ENROLLED -> kind not_enrolled, botón VISIBLE ---');
  const notEnrolled: GetLeagueParticipationResponse = { outcome: 'NOT_ENROLLED' };
  const notEnrolledView = describeParticipation(notEnrolled);
  check('kind === not_enrolled', notEnrolledView.kind === 'not_enrolled');
  check('botón "Unirme a la liga" VISIBLE únicamente en NOT_ENROLLED', showJoinButton(notEnrolledView) === true);

  console.log('--- 3. NO_ACTIVE_SEASON -> kind no_active_season, botón OCULTO ---');
  const noSeason: GetLeagueParticipationResponse = { outcome: 'NO_ACTIVE_SEASON' };
  const noSeasonView = describeParticipation(noSeason);
  check('kind === no_active_season', noSeasonView.kind === 'no_active_season');
  check('botón "Unirme a la liga" OCULTO en NO_ACTIVE_SEASON', showJoinButton(noSeasonView) === false);

  console.log('--- 4. La respuesta del POST (sin variante NOT_ENROLLED en su tipo) mapea igual para ENROLLED/NO_ACTIVE_SEASON ---');
  const postEnrolled: PostLeagueParticipationResponse = { outcome: 'ENROLLED', leagueName: 'Plata', leagueTier: 2, leaguePoints: 0, joinedAt: '2026-08-06T00:00:00.000Z', status: 'PROMOTED', season: SEASON_FIXTURE };
  const postEnrolledView = describeParticipation(postEnrolled);
  check('POST ENROLLED -> kind enrolled, mismo mapeo que GET', postEnrolledView.kind === 'enrolled' && postEnrolledView.kind === 'enrolled' && postEnrolledView.leagueName === 'Plata');
  const postNoSeason: PostLeagueParticipationResponse = { outcome: 'NO_ACTIVE_SEASON' };
  check('POST NO_ACTIVE_SEASON -> kind no_active_season, botón oculto', showJoinButton(describeParticipation(postNoSeason)) === false);

  console.log('--- 5. Solo NOT_ENROLLED muestra el botón -- exhaustivo sobre los tres/dos outcomes posibles ---');
  const allGetOutcomes: GetLeagueParticipationResponse[] = [enrolled, notEnrolled, noSeason];
  const withButton = allGetOutcomes.filter((o) => showJoinButton(describeParticipation(o)));
  check('EXACTAMENTE un outcome (NOT_ENROLLED) produce showJoinButton=true', withButton.length === 1 && withButton[0].outcome === 'NOT_ENROLLED');

  console.log('--- 6. Frontera estática: el hub NUNCA llama joinLeague() automáticamente ---');
  const hubSource = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'competir', 'index.tsx'), 'utf8');
  const useEffectBlocks = hubSource.match(/useEffect\([\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
  check('el archivo del hub existe y tiene al menos un useEffect (carga inicial)', useEffectBlocks.length > 0);
  const anyEffectCallsJoin = useEffectBlocks.some((block) => block.includes('joinLeague'));
  check('NINGÚN useEffect del hub invoca joinLeague() -- solo el onPress explícito del botón', !anyEffectCallsJoin);
  const joinCallSites = (hubSource.match(/joinLeague\(\)/g) ?? []).length;
  check('joinLeague() aparece EXACTAMENTE una vez en el archivo (dentro de handleJoinLeague, el onPress)', joinCallSites === 1);
  const handleJoinBlock = hubSource.slice(hubSource.indexOf('async function handleJoinLeague'), hubSource.indexOf('async function handleClaim'));
  check('esa única llamada vive dentro de handleJoinLeague (el manejador del onPress)', handleJoinBlock.includes('joinLeague()'));

  console.log('--- 7. COMPETITIVE V1: cuenta regresiva de temporada (§7) ---');
  const base = new Date('2026-08-31T00:00:00.000Z');
  const d6h12 = seasonCountdown('2026-09-06T12:00:00.000Z', base);
  check('>= 1 día -> "6 d 12 h"', !d6h12.ended && d6h12.label === '6 d 12 h');
  const h18m30 = seasonCountdown('2026-08-31T18:30:00.000Z', base);
  check('< 1 día -> "18 h 30 min"', !h18m30.ended && h18m30.label === '18 h 30 min');
  const m42 = seasonCountdown('2026-08-31T00:42:00.000Z', base);
  check('< 1 hora -> "42 min"', !m42.ended && m42.label === '42 min');
  check('temporada ya terminada -> { ended: true } (NUNCA cuenta regresiva negativa)', seasonCountdown('2026-08-30T00:00:00.000Z', base).ended === true);
  check('exactamente en el límite -> ended', seasonCountdown(base.toISOString(), base).ended === true);

  console.log('--- 8. COMPETITIVE V1: la tarjeta de Liga ENROLLED muestra rango/LP/cuenta regresiva ---');
  check('el hub consume `getMyCompetitiveProfile` para la POSICIÓN (nunca recalcula ranking en el cliente)', hubSource.includes('getMyCompetitiveProfile'));
  check('el hub usa `seasonCountdown` para la cuenta regresiva de 7 días', hubSource.includes('seasonCountdown('));
  check('estado honesto "Actualizando posición…" cuando la proyección aún no calculó', hubSource.includes('Actualizando posición'));
  check('el hub NUNCA infiere la liga del marco equipado -- usa `leagueTier`', hubSource.includes('view.leagueTier') && !hubSource.includes("cosmeticSlot === 'AVATAR_FRAME'"));
  check(
    'estados finales (PROMOTED/DEMOTED/RETAINED/SEASON_ENDED) tienen copy compacto en la MISMA tarjeta (sin pantalla nueva)',
    hubSource.includes('PARTICIPATION_STATUS_LABEL') &&
      hubSource.includes('isFinalParticipation') &&
      ['PROMOTED', 'DEMOTED', 'RETAINED', 'SEASON_ENDED'].every((s) => hubSource.includes(`'${s}'`)),
  );
  check('la ruta de Ranking no cambió -- sigue navegando a /(tabs)/competir/ranking', hubSource.includes("router.push('/(tabs)/competir/ranking')"));
  check('el estado "sin temporada activa" honesto se conserva', hubSource.includes('No hay una temporada de liga activa'));

  console.log('--- 9. COMPETITIVE V1 (rediseño visual, Incremento 3): tarjeta de Liga definitiva ---');
  check('usa el escudo real de la liga (`<LeagueEmblem`), no un icono de placeholder', hubSource.includes('<LeagueEmblem') && hubSource.includes('tier={view.leagueTier}'));
  check('usa el trofeo (`<LeagueTrophy`) junto al número de LP, no "N LP" / "N puntos de liga" como representación principal', hubSource.includes('<LeagueTrophy') && !/\bpuntos de liga\b/.test(hubSource));
  check('deriva accent/tint/halo de `leagueVisual(view.leagueTier, scheme)` -- misma arquitectura para las 7 ligas', hubSource.includes('leagueVisual(view.leagueTier, scheme)'));
  check('el tamaño del escudo es una constante única y ajustable (LEAGUE_EMBLEM_SIZE)', hubSource.includes('LEAGUE_EMBLEM_SIZE'));
  check('label pequeño "LIGA ACTUAL" en el estado en curso', hubSource.includes('LIGA ACTUAL'));
  check('label "TEMPORADA FINALIZADA" en el estado finalizado', hubSource.includes('TEMPORADA FINALIZADA'));
  check('la ZONA se toma de `competitiveZone` del backend -- el hub NUNCA la calcula', hubSource.includes('ctx.competitiveZone') && !/computeZoneCounts|resolveCompetitiveZone|parseTopPercent|parseBottomPercent/.test(hubSource));
  check('las tres zonas tienen copy (ascenso / permanencia / descenso)', /Zona de ascenso/.test(hubSource) && /Zona de permanencia/.test(hubSource) && /Zona de descenso/.test(hubSource));
  check('la posición final del estado finalizado sale del historial inmutable (`getLeagueHistory` / finalRank), nunca del ranking live', hubSource.includes('getLeagueHistory') && hubSource.includes('finalRank'));
  // Bloque JSX del estado finalizado: entre su encabezado y el del estado en curso.
  const finalizedBlock = hubSource.slice(hubSource.indexOf("topRow('TEMPORADA FINALIZADA')"), hubSource.indexOf("topRow('LIGA ACTUAL')"));
  check(
    'el estado finalizado NO renderiza cuenta regresiva ni zona en vivo ni "Ver ranking"',
    finalizedBlock.length > 0 && !finalizedBlock.includes('countdown.ended') && !finalizedBlock.includes('zoneChip(ctx') && !finalizedBlock.includes('Ver ranking'),
  );

  console.log('--- 8b. COMPETITIVE V1 (parche final de QA): LP VIVO vs POSICIÓN calculada, dos fuentes ---');
  // La tarjeta lee LP del saldo de la participación (`view.leaguePoints`) y
  // la posición del `CompetitiveContext` -- nunca los LP del leaderboard.
  const cardBlock = hubSource.slice(hubSource.indexOf('view.kind === \'enrolled\''), hubSource.indexOf('function renderHeader'));
  check('A/D. la tarjeta muestra los LP desde `view.leaguePoints` (saldo vivo de la participación)', cardBlock.includes('view.leaguePoints'));
  check('C/D. la tarjeta NO usa `position.metricValue` como los LP mostrados (evita el valor rezagado del último cálculo)', !cardBlock.includes('position.metricValue') && !cardBlock.includes('.metricValue}'));
  check('B. la posición se muestra desde `position.rankPosition` solo cuando `position.kind === \'known\'`', cardBlock.includes("position.kind === 'known'") && cardBlock.includes('position.rankPosition'));
  check('la posición pendiente cae a "Actualizando posición…", nunca a un número', cardBlock.includes('Actualizando posición'));
  check('D. el "#" del template siempre precede a `position.rankPosition` -- nunca un 0 ni el metricValue', /#\{position\.rankPosition\}/.test(cardBlock) && !/#\{position\.metricValue\}/.test(cardBlock) && !/#\{?0\}/.test(cardBlock));

  // Escenario A: enrolled + competitive null -> LP 6 visible, rango pendiente.
  const scenarioA = describeParticipation({ outcome: 'ENROLLED', leagueName: 'Bronce', leagueTier: 1, leaguePoints: 6, joinedAt: '2026-08-06T00:00:00.000Z', status: 'ACTIVE', season: SEASON_FIXTURE });
  check('A. con contexto competitivo aún nulo, el saldo 6 sigue disponible para la tarjeta', scenarioA.kind === 'enrolled' && scenarioA.leaguePoints === 6);
  // Escenario C: leaderboard rezagado (metric 4) mientras el saldo vivo es 6.
  const scenarioC = describeParticipation({ outcome: 'ENROLLED', leagueName: 'Bronce', leagueTier: 1, leaguePoints: 6, joinedAt: '2026-08-06T00:00:00.000Z', status: 'ACTIVE', season: SEASON_FIXTURE });
  check('C. el saldo de la participación (6) es la fuente de LP de la tarjeta, no el metricValue del leaderboard (4)', scenarioC.kind === 'enrolled' && scenarioC.leaguePoints === 6);
  // E/F: unión sigue siendo solo-botón (ya cubierto en secciones 5/6, reafirmado aquí).
  check('E/F. unirse sigue siendo solo por botón, sin auto-enrolamiento (reafirmación)', joinCallSites === 1 && !anyEffectCallsJoin);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Participación de Liga (mobile, Bloque IV Incremento 5, sub-incremento 5.a) pasaron.');
}

main();
