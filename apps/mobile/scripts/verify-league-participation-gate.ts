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
  console.log('--- 1. ENROLLED -> kind enrolled, con leagueName y status, botón OCULTO ---');
  const enrolled: GetLeagueParticipationResponse = { outcome: 'ENROLLED', leagueName: 'Bronce', joinedAt: '2026-08-06T00:00:00.000Z', status: 'ACTIVE' };
  const enrolledView = describeParticipation(enrolled);
  check('kind === enrolled', enrolledView.kind === 'enrolled');
  check('leagueName preservado', enrolledView.kind === 'enrolled' && enrolledView.leagueName === 'Bronce');
  check('status preservado', enrolledView.kind === 'enrolled' && enrolledView.status === 'ACTIVE');
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
  const postEnrolled: PostLeagueParticipationResponse = { outcome: 'ENROLLED', leagueName: 'Plata', joinedAt: '2026-08-06T00:00:00.000Z', status: 'PROMOTED' };
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

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Participación de Liga (mobile, Bloque IV Incremento 5, sub-incremento 5.a) pasaron.');
}

main();
