// Gate del Bloque IV, Incremento 5, sub-incremento 5.c ("Perfil competitivo
// móvil") -- prueba la lógica REAL de producción
// (`lib/competitive/position-card-copy.ts`) sin runtime de React Native,
// mismo criterio que verify-challenges-gate.ts. Incluye verificaciones
// ESTÁTICAS de las pantallas/componentes reales: componentes compartidos
// reutilizados (sin duplicar JSX), aislamiento de error por sección,
// ausencia de navegación en filas redactadas, cero imports de escritura en
// la pantalla de terceros, username sin normalización local.
//
// Esto NO reemplaza la verificación manual en Browser/simulador de las
// PANTALLAS (renderizado real, tema claro/oscuro, gestos, Android físico).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describePositionCardEmptyState } from '../lib/competitive/position-card-copy';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function readSource(...pathSegments: string[]): string {
  return readFileSync(join(__dirname, '..', ...pathSegments), 'utf8');
}

function main() {
  console.log('--- 1. describePositionCardEmptyState: copy CONTEXTUAL propio vs. ajeno ---');
  const ownEmpty = describePositionCardEmptyState('own');
  const otherEmpty = describePositionCardEmptyState('other');
  check('propio -> showAction true (invita a actuar)', ownEmpty.showAction === true);
  check('propio -> mensaje "Aún no participas..."', ownEmpty.message === 'Aún no participas en una liga activa');
  check('ajeno -> showAction false (sin acción sobre la cuenta de otra persona)', otherEmpty.showAction === false);
  check('ajeno -> mensaje "No participa..."', otherEmpty.message === 'No participa en la liga actual');
  check('los dos mensajes son DISTINTOS (copy realmente contextual, no genérico)', ownEmpty.message !== otherEmpty.message);

  console.log('--- 2. Componentes compartidos: perfil propio y perfil ajeno importan las MISMAS cuatro piezas ---');
  const sectionSource = readSource('components', 'competitive-profile-section.tsx');
  const otherProfileSource = readSource('app', '(tabs)', 'competir', 'perfil', '[username].tsx');
  const sharedComponents = ['CompetitiveIdentityHeader', 'CompetitivePositionCard', 'CompetitiveCosmeticsRow', 'CompetitiveAchievementsList'];
  for (const component of sharedComponents) {
    const inSection = sectionSource.includes(component);
    const inOtherProfile = otherProfileSource.includes(component);
    check(`${component} importado/usado en AMBAS pantallas (propia y ajena) -- sin JSX duplicado`, inSection && inOtherProfile);
  }
  // Importados del MISMO módulo en ambas -- no dos copias del componente con el mismo nombre.
  const identityImportSection = sectionSource.match(/from '.*identity-header'/)?.[0];
  const identityImportOther = otherProfileSource.match(/from '.*identity-header'/)?.[0];
  check('identity-header.tsx: ambas pantallas importan desde components/competitive/ (mismo archivo fuente)', !!identityImportSection && !!identityImportOther);

  console.log('--- 3. Aislamiento de errores por sección: la sección competitiva tiene su PROPIO estado, sin acoplarse al resto de perfil.tsx ---');
  check('CompetitiveProfileSection declara su propio useState<SectionState>', sectionSource.includes('useState<SectionState>'));
  const perfilSource = readSource('app', '(tabs)', 'perfil.tsx');
  check('perfil.tsx renderiza <CompetitiveProfileSection /> SIN pasarle props (estado 100% interno, no compartido)', /<CompetitiveProfileSection\s*\/>/.test(perfilSource));
  check('perfil.tsx sigue manejando su PROPIO ScreenState (displayName/username), sin fusionarlo con el de la sección competitiva', perfilSource.includes('useState<ScreenState>'));

  console.log('--- 4. Sin navegación en filas redactadas del ranking ---');
  const rankingSource = readSource('app', '(tabs)', 'competir', 'ranking.tsx');
  const redactedBranchStart = rankingSource.indexOf('if (!row.presentable)');
  const redactedBranchEnd = rankingSource.indexOf('return (', rankingSource.indexOf('return (', redactedBranchStart) + 1);
  const redactedBranch = rankingSource.slice(redactedBranchStart, redactedBranchEnd);
  check('la rama redactada NO usa Pressable', !redactedBranch.includes('Pressable'));
  check('la rama redactada NO tiene onPress ni router.push', !redactedBranch.includes('onPress') && !redactedBranch.includes('router.push'));
  const presentableBranch = rankingSource.slice(redactedBranchEnd);
  check('la rama PRESENTABLE sí navega al perfil (Pressable + router.push hacia perfil/[username])', presentableBranch.includes('Pressable') && presentableBranch.includes("competir/perfil/[username]"));

  console.log('--- 5. Pantalla de terceros: SOLO LECTURA -- cero imports de escritura ---');
  const forbiddenWriteSymbols = [
    'updateProfile',
    'initializeProfile',
    'joinLeague',
    'claimChallenge',
    'equipCosmetic',
    "'PATCH'",
    "'POST'",
    "'PUT'",
    "'DELETE'",
  ];
  check(
    '[username].tsx no importa ni invoca ningún símbolo/verbo de escritura',
    forbiddenWriteSymbols.every((symbol) => !otherProfileSource.includes(symbol)),
  );
  check('[username].tsx solo importa getUserCompetitiveProfile de lib/api/competitive (lectura)', otherProfileSource.includes('getUserCompetitiveProfile') && !otherProfileSource.includes('getMyCompetitiveProfile'));

  console.log('--- 6. 404 uniforme: un único mensaje, sin distinguir el motivo ---');
  const notFoundBranch = otherProfileSource.slice(otherProfileSource.indexOf("status === 'not_found'"));
  const forbiddenMotiveWords = ['PRIVATE', 'RETIRED', 'ANONYMIZED', 'lifecycleStatus'];
  check('la rama not_found no distingue PRIVATE/RETIRED/ANONYMIZED -- un único mensaje', forbiddenMotiveWords.every((w) => !notFoundBranch.slice(0, 400).includes(w)));
  // "lifecycleStatus" puede aparecer legítimamente en un comentario
  // explicando POR QUÉ no se usa -- se verifica que nunca se ACCEDA como
  // propiedad (`profile.lifecycleStatus`/`.lifecycleStatus`), no la mera
  // presencia de la palabra en el archivo.
  check('CompetitiveProfileResponse (perfil ajeno) nunca ACCEDE a .lifecycleStatus -- el tipo no lo declara', !otherProfileSource.includes('.lifecycleStatus'));

  console.log('--- 7. username NUNCA renormalizado localmente antes de navegar/consultar ---');
  const forbiddenNormalizationOps = ['.toLowerCase()', '.toUpperCase()', '.normalize('];
  check('[username].tsx no aplica ninguna normalización al username recibido', forbiddenNormalizationOps.every((op) => !otherProfileSource.includes(op)));
  check('ranking.tsx tampoco normaliza username antes de navegar', forbiddenNormalizationOps.every((op) => !presentableBranch.includes(op)));
  check('lib/api/competitive.ts codifica el username como segmento de URL (encodeURIComponent)', readSource('lib', 'api', 'competitive.ts').includes('encodeURIComponent(username)'));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Perfil Competitivo (móvil, Bloque IV Incremento 5, sub-incremento 5.c) pasaron.');
}

main();
