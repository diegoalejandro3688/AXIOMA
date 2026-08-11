// Gate del Bloque IV, Incremento 5, sub-incremento 5.c ("Perfil competitivo
// móvil"), EVOLUCIONADO en LEF Bloque V, Incremento 8
// (docs/adr/LEF-BLOCK-V-DEFINITION.md §16) -- prueba la lógica REAL de
// producción (`lib/competitive/position-card-copy.ts`) sin runtime de React
// Native, mismo criterio que verify-challenges-gate.ts. Incluye
// verificaciones ESTÁTICAS de las pantallas/componentes reales: componentes
// compartidos reutilizados (sin duplicar JSX), ausencia de navegación en
// filas redactadas, cero imports de escritura en la pantalla de terceros y
// en la vista previa pública, username sin normalización local.
//
// Actualización LEF Bloque V, Incremento 8 (decisión del Product Owner,
// 2026-08-11): las secciones 2/3 se reescribieron para reflejar la
// arquitectura NUEVA y autorizada -- `CompetitiveProfileSection` pasó de
// auto-alimentarse (fetch propio) a ser un componente de presentación puro,
// y `[username].tsx`/`preview.tsx` (Incremento 7) ahora comparten
// `PublicProfileView` en vez de reimplementar el mismo JSX cada una. Esto
// NO reabre el dominio de Bloque IV (ADR-0021/`UserService` sin cambio,
// mismos endpoints, mismos gates de backend) -- es evolución de CÓMO la
// superficie móvil consume esos endpoints, explícitamente autorizada por
// LEF Bloque V. Ninguna cobertura funcional se perdió: cada aserción
// obsoleta fue reemplazada por una equivalente contra la nueva arquitectura
// (ver comentarios en cada sección); las aserciones 4-7 (navegación de
// ranking, solo-lectura de terceros, 404 uniforme, sin normalización de
// username) permanecen intactas porque siguen siendo válidas sin cambio. La
// sección 8 (nueva) extiende esas mismas verificaciones a `preview.tsx`; la
// sección 9 (nueva) confirma que la conversión de `perfil.tsx` a
// `perfil/index.tsx` no alteró la identidad de la tab ni creó una tab nueva.
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

  console.log('--- 2. Componentes compartidos: perfil propio (vía CompetitiveProfileSection) y perfil ajeno/preview (vía PublicProfileView) usan las MISMAS cuatro piezas -- sin JSX duplicado ---');
  const sectionSource = readSource('components', 'competitive-profile-section.tsx');
  const publicProfileViewSource = readSource('components', 'competitive', 'public-profile-view.tsx');
  const otherProfileSource = readSource('app', '(tabs)', 'competir', 'perfil', '[username].tsx');
  const previewSource = readSource('app', '(tabs)', 'perfil', 'preview.tsx');
  const sharedComponents = ['CompetitiveIdentityHeader', 'CompetitivePositionCard', 'CompetitiveCosmeticsRow', 'CompetitiveAchievementsList'];
  for (const component of sharedComponents) {
    const inSection = sectionSource.includes(component);
    const inPublicProfileView = publicProfileViewSource.includes(component);
    check(`${component} importado/usado tanto por CompetitiveProfileSection (propio) como por PublicProfileView (terceros/preview) -- sin JSX duplicado`, inSection && inPublicProfileView);
  }
  // LEF Bloque V, Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §16, decisión del Product Owner) --
  // [username].tsx y preview.tsx (Incremento 7) ya NO importan las cuatro piezas directamente:
  // ambas delegan en el MISMO componente de presentación (`PublicProfileView`), evitando que
  // cada pantalla vuelva a ensamblar el mismo JSX -- un nivel MÁS de deduplicación que antes,
  // no una regresión de cobertura (la identidad del componente compartido se sigue verificando,
  // ahora contra `public-profile-view.tsx` en vez de contra cada pantalla por separado).
  check('[username].tsx (perfil de un tercero) renderiza <PublicProfileView profile={...} />, no reimplementa el JSX', otherProfileSource.includes('PublicProfileView') && !sharedComponents.some((c) => otherProfileSource.includes(c)));
  check('preview.tsx (Incremento 7) renderiza <PublicProfileView profile={...} />, mismo componente EXACTO que [username].tsx', previewSource.includes('PublicProfileView') && !sharedComponents.some((c) => previewSource.includes(c)));
  const identityImportSection = sectionSource.match(/from '.*identity-header'/)?.[0];
  const identityImportPublicView = publicProfileViewSource.match(/from '.*identity-header'/)?.[0];
  check('identity-header.tsx: CompetitiveProfileSection y PublicProfileView importan desde components/competitive/ (mismo archivo fuente)', !!identityImportSection && !!identityImportPublicView);

  console.log('--- 3. CompetitiveProfileSection: EVOLUCIONADO en LEF Bloque V, Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §16, decisión del Product Owner) de componente auto-alimentado a componente de PRESENTACIÓN pura ---');
  // Antes (Bloque IV): CompetitiveProfileSection hacía su PROPIO fetch a GET .../me/competitive-profile,
  // con su propio useState<SectionState> y su propio loading/error -- exactamente el "fetch duplicado
  // del mismo dato" que LEF Bloque V, Incremento 8 exige evitar, porque GET /user/me/advanced-profile
  // (Incremento 5) ya compone ese mismo dato. La cobertura funcional NO disminuye: se reemplaza
  // "la sección se aísla haciendo su propio fetch" por "la sección se aísla siendo pura función de
  // sus props" -- en ambos casos, un fallo en OTRA sección de la pantalla nunca puede corromper esta.
  check('CompetitiveProfileSection es un componente de PRESENTACIÓN puro -- recibe `profile` por props, sin useState propio', /export function CompetitiveProfileSection\(\{\s*profile\s*\}/.test(sectionSource) && !sectionSource.includes('useState'));
  // Se busca el IMPORT real del cliente de API (no una mención en comentario/documentación --
  // este mismo archivo documenta legítimamente `UserService.getMyCompetitiveProfile` en prosa).
  check('CompetitiveProfileSection NUNCA importa el cliente de API competitivo -- cero fetch propio (evita el fetch duplicado, Incremento 8)', !/^import .*from ['"]\.\.\/lib\/api\/competitive['"]/m.test(sectionSource));
  const perfilIndexSource = readSource('app', '(tabs)', 'perfil', 'index.tsx');
  check('perfil/index.tsx hace LA ÚNICA carga canónica vía getMyAdvancedProfile (Incremento 5) -- fuente única para encabezado/competitivo/académico/historial', perfilIndexSource.includes('getMyAdvancedProfile'));
  check('perfil/index.tsx NUNCA importa getMyCompetitiveProfile por separado -- sin fetch duplicado del mismo dato', !perfilIndexSource.includes('getMyCompetitiveProfile'));
  check('perfil/index.tsx pasa <CompetitiveProfileSection profile={view.publicProfile} /> -- dato YA resuelto por la única carga, nunca una segunda fuente', /<CompetitiveProfileSection\s+profile=\{view\.publicProfile\}\s*\/>/.test(perfilIndexSource));
  check('perfil/index.tsx sigue manejando su PROPIO ScreenState (displayName/agregado), con loading/error ÚNICOS para toda la pantalla -- sin loading/error states compitiendo entre secciones', perfilIndexSource.includes('useState<ScreenState>'));

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

  console.log('--- 8. LEF Bloque V, Incremento 8: preview.tsx -- SOLO LECTURA, sin datos privados, mismo 404 uniforme que [username].tsx (decisión del Product Owner, sin segunda lógica pública) ---');
  check(
    'preview.tsx no importa ni invoca ningún símbolo/verbo de escritura',
    forbiddenWriteSymbols.every((symbol) => !previewSource.includes(symbol)),
  );
  check('preview.tsx importa EXCLUSIVAMENTE getMyProfilePreview de lib/api/preview -- ningún otro cliente de API', previewSource.includes('getMyProfilePreview') && (previewSource.match(/from '\.\.\/\.\.\/\.\.\/lib\/api\//g) ?? []).length === 1);
  const forbiddenPreviewAugmentationSymbols = ['getMyAdvancedProfile', 'academicSummary', 'competitiveHistory', 'listCosmetics', 'listTitles', 'AcademicSummarySection', 'CompetitiveHistorySection', 'CosmeticsSection', 'TitlesSection'];
  check(
    'preview.tsx NUNCA combina con advanced-profile/académico/historial/inventario -- solo representa el contrato recibido de GET .../me/preview',
    forbiddenPreviewAugmentationSymbols.every((symbol) => !previewSource.includes(symbol)),
  );
  const previewNotFoundBranch = previewSource.slice(previewSource.indexOf("status === 'not_presentable'"));
  check('preview.tsx no distingue PRIVATE/RETIRED/ANONYMIZED en su estado "no presentable" -- mismo 404 uniforme que un tercero real', forbiddenMotiveWords.every((w) => !previewNotFoundBranch.slice(0, 600).includes(w)));
  check('preview.tsx nunca ACCEDE a .lifecycleStatus -- CompetitiveProfileResponse no lo declara (misma forma pública que [username].tsx, nunca la forma "me" privilegiada)', !previewSource.includes('.lifecycleStatus'));
  check('perfil/index.tsx expone "Ver cómo me ven otros" navegando a /(tabs)/perfil/preview', perfilIndexSource.includes('(tabs)/perfil/preview'));

  console.log('--- 9. Navegación: la tab "perfil" sigue existiendo, preview NO es una tab independiente ---');
  const tabsLayoutSource = readSource('app', '(tabs)', '_layout.tsx');
  check('app/(tabs)/_layout.tsx sigue declarando exactamente 5 <Tabs.Screen> (index/estudio/competir/ia/perfil) -- sin una tab nueva para preview', (tabsLayoutSource.match(/<Tabs\.Screen/g) ?? []).length === 5 && tabsLayoutSource.includes('name="perfil"'));
  const perfilLayoutSource = readSource('app', '(tabs)', 'perfil', '_layout.tsx');
  check('app/(tabs)/perfil/_layout.tsx declara EXACTAMENTE index + preview como Stack (misma pestaña, sub-navegación interna)', perfilLayoutSource.includes('name="index"') && perfilLayoutSource.includes('name="preview"') && (perfilLayoutSource.match(/<Stack\.Screen/g) ?? []).length === 2);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Perfil Competitivo (móvil, Bloque IV Incremento 5, sub-incremento 5.c) pasaron.');
}

main();
