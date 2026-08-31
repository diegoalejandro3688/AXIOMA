// Gate de LEF Bloque V, Incremento 8 ("Superficie móvil", ver
// docs/adr/LEF-BLOCK-V-DEFINITION.md §16) -- prueba la lógica REAL de
// producción (`lib/personalization/unlock-requirement-copy.ts`,
// `lib/cosmetics/group-cosmetics.ts` [extensión `groupLockedCosmetics`],
// `lib/titles/equip-outcome.ts`) sin runtime de React Native, mismo
// criterio que `verify-cosmetics-gate.ts`/`verify-competitive-profile-gate.ts`.
// Incluye verificaciones ESTÁTICAS de las pantallas/componentes reales:
// fuente única de carga (agregador), locked NUNCA equipable, doble-toque
// bloqueado, y consumo real de los contratos de los Incrementos 1-7.
//
// Esto NO reemplaza la verificación manual en Browser/simulador de las
// PANTALLAS (renderizado real, tema claro/oscuro, estados de la vista
// previa) -- ver evidencia adjunta en el reporte de cierre.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LockedCosmetic, LockedTitle, UnlockRequirement, EquippedTitleResponse } from '@axioma/contracts';
import type { ApiResult } from '../lib/api/client';
import { describeUnlockRequirement, describeUnlockRequirements } from '../lib/personalization/unlock-requirement-copy';
import { groupLockedCosmetics, groupOwnedCosmetics } from '../lib/cosmetics/group-cosmetics';
import { mapEquipTitleResult } from '../lib/titles/equip-outcome';

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

let seq = 0;
function makeLockedCosmetic(requirements: UnlockRequirement[], overrides: Partial<LockedCosmetic> = {}): LockedCosmetic {
  seq++;
  return {
    cosmeticItemId: `cosmetic-${seq}`,
    itemKey: `key-${seq}`,
    itemType: 'BADGE',
    name: `Bloqueado ${seq}`,
    description: null,
    rarityClass: 'RARE',
    assetReference: `https://cdn.example.com/locked-${seq}.png`,
    unlockRequirements: requirements,
    ...overrides,
  };
}

function makeLockedTitle(requirements: UnlockRequirement[]): LockedTitle {
  seq++;
  return {
    titleDefinitionId: `title-${seq}`,
    titleKey: `title-key-${seq}`,
    displayText: `Título bloqueado ${seq}`,
    description: null,
    rarityClass: 'EPIC',
    unlockRequirements: requirements,
  };
}

function main() {
  console.log('--- 1. describeUnlockRequirement: texto derivado EXCLUSIVAMENTE de campos estructurados, uno por cada `source` ---');
  const levelReq: UnlockRequirement = { source: 'LEVEL', levelNumber: 5, minimumLifetimeXp: 1200 };
  const achievementReq: UnlockRequirement = { source: 'ACHIEVEMENT', achievementKey: 'ach-1', achievementName: 'Racha de 7 días', unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 100 } };
  const challengeReq: UnlockRequirement = { source: 'CHALLENGE', challengeKey: 'ch-1', challengeName: 'Desafío semanal', challengeType: 'WEEKLY', completionRule: 'complete-3-sessions' };

  check('LEVEL -> menciona el levelNumber real, nunca un valor fijo', describeUnlockRequirement(levelReq).includes('5') && describeUnlockRequirement({ ...levelReq, levelNumber: 9 }).includes('9'));
  check('ACHIEVEMENT -> menciona el achievementName real recibido', describeUnlockRequirement(achievementReq).includes('Racha de 7 días'));
  check('CHALLENGE -> menciona el challengeName real recibido', describeUnlockRequirement(challengeReq).includes('Desafío semanal'));
  check('los tres textos son DISTINTOS entre sí (no un genérico "Bloqueado")', new Set([describeUnlockRequirement(levelReq), describeUnlockRequirement(achievementReq), describeUnlockRequirement(challengeReq)]).size === 3);

  console.log('--- 2. describeUnlockRequirements: múltiples requisitos se listan TODOS, ninguno se descarta ---');
  const combined = describeUnlockRequirements([levelReq, achievementReq]);
  check('el texto combinado contiene AMBOS requisitos', combined.includes('5') && combined.includes('Racha de 7 días'));

  console.log('--- 3. groupLockedCosmetics: partición por slot EXACTA, mismo criterio que groupOwnedCosmetics ---');
  const lockedBadge = makeLockedCosmetic([levelReq], { itemType: 'BADGE' });
  const lockedFrame = makeLockedCosmetic([achievementReq], { itemType: 'AVATAR_FRAME' });
  const grouped = groupLockedCosmetics([lockedBadge, lockedFrame]);
  check('BADGE bloqueado cae en el slot BADGE', grouped.BADGE.length === 1 && grouped.BADGE[0]!.cosmeticItemId === lockedBadge.cosmeticItemId);
  check('AVATAR_FRAME bloqueado cae en el slot AVATAR_FRAME', grouped.AVATAR_FRAME.length === 1 && grouped.AVATAR_FRAME[0]!.cosmeticItemId === lockedFrame.cosmeticItemId);
  check('slots sin elementos bloqueados quedan vacíos, no undefined', Array.isArray(grouped.AVATAR) && grouped.AVATAR.length === 0 && Array.isArray(grouped.PROFILE_BANNER));
  check('groupOwnedCosmetics sigue intacto (Bloque III, sin regresión) -- lista vacía produce los 4 slots vacíos', Object.values(groupOwnedCosmetics([])).every((list) => list.length === 0));

  console.log('--- 4. mapEquipTitleResult: mismo mapeo de outcomes que mapEquipResult (cosméticos), aplicado a títulos ---');
  const okResult: ApiResult<EquippedTitleResponse | null> = { ok: true, data: null };
  const notFoundResult: ApiResult<EquippedTitleResponse | null> = { ok: false, kind: 'http', status: 404, message: 'no encontrado' };
  const conflictResult: ApiResult<EquippedTitleResponse | null> = { ok: false, kind: 'http', status: 409, message: 'ya no disponible' };
  const networkResult: ApiResult<EquippedTitleResponse | null> = { ok: false, kind: 'network', message: 'sin conexión' };
  const serverErrorResult: ApiResult<EquippedTitleResponse | null> = { ok: false, kind: 'http', status: 500, message: 'error interno' };

  check('200 (quitar título, data=null) -> kind ok, data=null', mapEquipTitleResult(okResult).kind === 'ok');
  check('404 -> kind reload (reconciliar TODO el catálogo, no adivinar)', mapEquipTitleResult(notFoundResult).kind === 'reload');
  check('409 -> kind conflict, conserva el equipamiento anterior', mapEquipTitleResult(conflictResult).kind === 'conflict');
  check('error de red -> kind network', mapEquipTitleResult(networkResult).kind === 'network');
  check('500 -> kind error genérico, con status preservado', mapEquipTitleResult(serverErrorResult).kind === 'error' && (mapEquipTitleResult(serverErrorResult) as { status: number }).status === 500);

  const lockedTitle = makeLockedTitle([challengeReq]);
  check('LockedTitle también resuelve un texto no vacío vía describeUnlockRequirements (misma función, ambos tipos)', describeUnlockRequirements(lockedTitle.unlockRequirements).length > 0);

  console.log('--- 5. perfil/index.tsx: fuente ÚNICA de carga (agregador Incremento 5), sin fetch duplicado del académico/historial ---');
  const perfilIndexSource = readSource('app', '(tabs)', 'perfil', 'index.tsx');
  check('perfil/index.tsx usa getMyAdvancedProfile como única fuente de datos del encabezado/académico/historial', perfilIndexSource.includes('getMyAdvancedProfile'));
  const forbiddenDuplicateFetches = ['getAcademicSummary', 'getCompetitiveHistory', 'getMyCompetitiveProfile'];
  check('perfil/index.tsx NUNCA vuelve a pedir por separado lo que el agregador ya trae', forbiddenDuplicateFetches.every((symbol) => !perfilIndexSource.includes(symbol)));
  // PROFILE-4 (decisión del Product Owner, 2026-08-22): `AcademicSummarySection`
  // se dividió en `AcademicStatsSection` (pestaña Estadísticas) y
  // `SubjectProgressSection` (pestaña Resumen) -- ambas reciben el MISMO
  // `view.academicSummary` del agregador, sin cálculo ni fetch propio.
  check('perfil/index.tsx renderiza AcademicStatsSection con summary={view.academicSummary} (mismo dato del agregador)', /<AcademicStatsSection\s+summary=\{view\.academicSummary\}\s*\/>/.test(perfilIndexSource));
  check('perfil/index.tsx renderiza SubjectProgressSection con summary={view.academicSummary} (mismo dato del agregador)', /<SubjectProgressSection\s+summary=\{view\.academicSummary\}\s*\/>/.test(perfilIndexSource));
  // PROFILE-4: `CompetitiveHistorySection` -- desconectado visualmente en
  // PROFILE-3, RECONECTADO aquí en la pestaña Estadísticas, mismo dato del
  // agregador (`view.competitiveHistory`), cero fetch nuevo.
  check('perfil/index.tsx renderiza CompetitiveHistorySection con history={view.competitiveHistory} (mismo dato del agregador)', /<CompetitiveHistorySection\s+history=\{view\.competitiveHistory\}\s*\/>/.test(perfilIndexSource));

  // PROFILE-PERSONALIZATION-REMODEL (2026-08-30): la remodelación visual
  // reemplazó el acordeón `CosmeticSlotCard` por una presentación de grids/
  // listas en `components/personalization/cosmetic-collection.tsx`. La
  // invariante real -- "un cosmético bloqueado NUNCA es equipable y SIEMPRE
  // muestra el requisito real" -- no cambió: vive ahora en el componente
  // `LockedCosmeticCollection` de ese archivo (solo lectura: `View`, nunca
  // `Pressable`/`onPress`/`equipCosmetic`). El chequeo se repunta a esa
  // función, aislada del resto del archivo (que sí tiene `Pressable` para
  // los elementos EQUIPABLES).
  console.log('--- 6. Personalización: ningún elemento locked es equipable (ni cosméticos ni títulos) ---');
  const cosmeticCollectionSource = readSource('components', 'personalization', 'cosmetic-collection.tsx');
  const cosmeticsLockedBlockStart = cosmeticCollectionSource.indexOf('export function LockedCosmeticCollection');
  // Fin de la función: el siguiente `\nfunction ` a nivel de módulo.
  const cosmeticsLockedBlockEnd = cosmeticCollectionSource.indexOf('\nfunction ', cosmeticsLockedBlockStart);
  const cosmeticsLockedBlock = cosmeticCollectionSource.slice(cosmeticsLockedBlockStart, cosmeticsLockedBlockEnd);
  check('componente "LockedCosmeticCollection" existe y es localizable', cosmeticsLockedBlockStart > -1 && cosmeticsLockedBlockEnd > cosmeticsLockedBlockStart);
  check('el bloque de cosméticos bloqueados NUNCA usa Pressable/onPress/equipCosmetic -- solo lectura, nunca equipable', !cosmeticsLockedBlock.includes('Pressable') && !cosmeticsLockedBlock.includes('onPress') && !cosmeticsLockedBlock.includes('equipCosmetic'));
  check('el bloque de cosméticos bloqueados muestra el requisito real (describeUnlockRequirements), nunca un texto hardcodeado', cosmeticsLockedBlock.includes('describeUnlockRequirements'));
  // La lógica de fetch/estado/equipamiento (no optimista, bloqueo por slot)
  // sigue en `useCosmeticsController` (`cosmetics-section.tsx`) sin cambio.
  const cosmeticsControllerSource = readSource('components', 'cosmetics-section.tsx');
  check('useCosmeticsController sigue bloqueando doble toque por slot y sin equipamiento optimista', cosmeticsControllerSource.includes('if (equippingSlot !== null) return;') && cosmeticsControllerSource.includes('outcome.data') && !cosmeticsControllerSource.includes('// optimist'));

  const titlesSectionSource = readSource('components', 'profile', 'titles-section.tsx');
  const titlesLockedBlockStart = titlesSectionSource.indexOf("locked.length > 0");
  const titlesLockedBlock = titlesSectionSource.slice(titlesLockedBlockStart);
  check('bloque "Bloqueados" de TitlesSection existe y es localizable', titlesLockedBlockStart > -1);
  check('el bloque de títulos bloqueados NUNCA usa Pressable/onPress/equipTitle -- solo lectura, nunca equipable', !titlesLockedBlock.includes('Pressable') && !titlesLockedBlock.includes('onPress') && !titlesLockedBlock.includes('equipTitle('));
  check('el bloque de títulos bloqueados muestra el requisito real (describeUnlockRequirements)', titlesLockedBlock.includes('describeUnlockRequirements'));

  console.log('--- 7. Doble toque bloqueado en equipamiento (cosméticos ya vigente desde Bloque III, títulos NUEVO en este incremento) ---');
  check('useCosmeticsController sigue bloqueando doble toque por slot (Bloque III, sin regresión)', cosmeticsControllerSource.includes('if (equippingSlot !== null) return;'));
  check('useTitlesController bloquea doble toque mientras un PATCH está en curso (mismo criterio, NUEVO en Incremento 8)', titlesSectionSource.includes('if (equipping) return;'));
  check('TitlesSection reconcilia con la respuesta REAL del servidor -- sin equipamiento optimista (mismo criterio que CosmeticsSection)', titlesSectionSource.includes('outcome.data') && !titlesSectionSource.includes('// optimist'));

  console.log('--- 8. Vista previa pública: NUNCA muestra académico/historial/inventario, NUNCA usa advanced-profile para completar huecos (decisión del Product Owner) ---');
  const previewSource = readSource('app', '(tabs)', 'perfil', 'preview.tsx');
  // Símbolos reales de código (imports/uso), no palabras sueltas como "owned"/"locked"
  // -- esas aparecen legítimamente en la prosa del comentario de este mismo archivo
  // explicando qué NO se muestra.
  const forbiddenPrivateSurfaces = ['academicSummary', 'competitiveHistory', 'AcademicStatsSection', 'SubjectProgressSection', 'CompetitiveHistorySection', 'CosmeticsSection', 'TitlesSection', 'getMyAdvancedProfile', 'listCosmetics', 'listTitles'];
  check('preview.tsx no importa/usa ningún símbolo de código de superficies privadas (académico/historial/inventario/agregador)', forbiddenPrivateSurfaces.every((symbol) => !previewSource.includes(symbol)));

  // PROFILE-5B (decisión del Product Owner, 2026-08-22): la configuración
  // de CUENTA (editor de displayName, zona horaria, username/privacidad,
  // "Cerrar sesión") se movió de `personalizacion.tsx` (que PROFILE-4
  // había dejado dedicada a esto) al panel de Ajustes dentro de
  // `perfil/index.tsx` -- `personalizacion.tsx` queda EXCLUSIVAMENTE
  // dedicada a apariencia (cosméticos + títulos). La invariante real
  // ("estas funciones siguen existiendo, con los mismos endpoints, en
  // alguna superficie real de la app") se verifica ahora contra la nueva
  // ubicación. La aserción de PROFILE-4 sobre `getProfile()` independiente
  // desaparece porque ya no representa la arquitectura correcta: al vivir
  // Ajustes en la MISMA pantalla que la única carga canónica, ya no hace
  // falta ningún fetch aparte para displayName -- se reemplaza por una
  // protección más fuerte (cero fetch nuevo, mismo `view.profile`).
  console.log('--- 9. Regresión de Configuración existente: displayName/timezone/logout se conservan en el panel de Ajustes (perfil/index.tsx) ---');
  const personalizacionSource = readSource('app', '(tabs)', 'perfil', 'personalizacion.tsx');
  check('perfil/index.tsx conserva initializeProfile/updateProfile (ADR-0008, sin cambio de dominio)', perfilIndexSource.includes('initializeProfile') && perfilIndexSource.includes('updateProfile'));
  check('perfil/index.tsx conserva auth.logout (cerrar sesión)', perfilIndexSource.includes('auth.logout'));
  check('perfil/index.tsx muestra la zona horaria (timezone) del perfil, mismo criterio que antes', perfilIndexSource.includes('timezone'));
  check(
    'perfil/index.tsx siembra el editor de displayName desde view.profile (el MISMO dato de getMyAdvancedProfile) -- CERO fetch nuevo para esto',
    perfilIndexSource.includes('view.profile?.displayName') || perfilIndexSource.includes('view.profile.displayName'),
  );
  check(
    'personalizacion.tsx queda EXCLUSIVAMENTE dedicada a apariencia -- ya NO monta el editor de configuración de cuenta',
    !personalizacionSource.includes('initializeProfile') && !personalizacionSource.includes('handleToggleVisibility') && !personalizacionSource.includes('auth.logout'),
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Superficie Móvil de Perfil Avanzado (LEF Bloque V, Incremento 8) pasaron.');
}

main();
