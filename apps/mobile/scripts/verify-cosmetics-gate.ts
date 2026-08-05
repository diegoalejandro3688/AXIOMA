// Gate del Bloque III, Incremento 5, sub-incremento 5.c ("Superficie móvil
// de Cosméticos") -- ver docs/adr/BLOCK-III-DEFINITION.md §4.21. Prueba la
// lógica REAL de producción (`group-cosmetics.ts`, `equip-outcome.ts`) sin
// runtime de React Native -- ambos módulos son deliberadamente libres de
// imports de RN/Expo (solo un `import type` de `lib/api/client.ts`, elidido
// en compilación) para que esto sea posible con `tsx` puro, mismo criterio
// que `verify-challenges-gate.ts` (4.d).
//
// Esto NO reemplaza la verificación manual en Android (tema claro/oscuro,
// gestos, doble toque real) -- ver el checklist en
// docs/adr/BLOCK-III-DEFINITION.md §4.21.
import type { CosmeticSummary, OwnedCosmetic } from '@axioma/contracts';
import type { ApiResult } from '../lib/api/client';
import { COSMETIC_SLOTS, SLOT_LABEL, groupOwnedCosmetics } from '../lib/cosmetics/group-cosmetics';
import { mapEquipResult } from '../lib/cosmetics/equip-outcome';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

let seq = 0;
function makeOwned(overrides: Partial<OwnedCosmetic> = {}): OwnedCosmetic {
  seq++;
  return {
    inventoryItemId: `inv-${seq}`,
    cosmeticItemId: `item-${seq}`,
    itemKey: `key-${seq}`,
    itemType: 'AVATAR',
    name: `Cosmético ${seq}`,
    description: null,
    rarityClass: 'COMMON',
    assetReference: `https://cdn.example.com/${seq}.png`,
    acquiredAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSummary(overrides: Partial<CosmeticSummary> = {}): CosmeticSummary {
  seq++;
  return {
    inventoryItemId: `inv-${seq}`,
    cosmeticItemId: `item-${seq}`,
    itemKey: `key-${seq}`,
    itemType: 'AVATAR',
    name: `Cosmético ${seq}`,
    description: null,
    rarityClass: 'COMMON',
    assetReference: `https://cdn.example.com/${seq}.png`,
    equippedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function main() {
  console.log('--- 1. Los 4 slots existen siempre, sin depender del inventario ---');
  check('COSMETIC_SLOTS tiene exactamente 4 entradas', COSMETIC_SLOTS.length === 4);
  check(
    'COSMETIC_SLOTS son AVATAR, AVATAR_FRAME, PROFILE_BANNER, BADGE -- TITLE excluido (Gate 35)',
    JSON.stringify(COSMETIC_SLOTS) === JSON.stringify(['AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE']),
  );
  check('SLOT_LABEL define una etiqueta para cada slot', COSMETIC_SLOTS.every((slot) => typeof SLOT_LABEL[slot] === 'string' && SLOT_LABEL[slot].length > 0));

  console.log('--- 2. groupOwnedCosmetics: agrupación correcta por tipo, sin decidir a qué slot pertenece cada uno ---');
  const avatarItem = makeOwned({ itemType: 'AVATAR' });
  const frameItem = makeOwned({ itemType: 'AVATAR_FRAME' });
  const bannerItem = makeOwned({ itemType: 'PROFILE_BANNER' });
  const badgeItem = makeOwned({ itemType: 'BADGE' });
  const grouped = groupOwnedCosmetics([avatarItem, frameItem, bannerItem, badgeItem]);
  check('AVATAR cae en su propio grupo', grouped.AVATAR.includes(avatarItem) && grouped.AVATAR.length === 1);
  check('AVATAR_FRAME cae en su propio grupo', grouped.AVATAR_FRAME.includes(frameItem) && grouped.AVATAR_FRAME.length === 1);
  check('PROFILE_BANNER cae en su propio grupo', grouped.PROFILE_BANNER.includes(bannerItem) && grouped.PROFILE_BANNER.length === 1);
  check('BADGE cae en su propio grupo', grouped.BADGE.includes(badgeItem) && grouped.BADGE.length === 1);

  console.log('--- 3. groupOwnedCosmetics: inventario vacío -> los 4 grupos existen vacíos, ninguno es undefined ---');
  const emptyGrouped = groupOwnedCosmetics([]);
  check(
    'los 4 slots están presentes como arrays vacíos',
    COSMETIC_SLOTS.every((slot) => Array.isArray(emptyGrouped[slot]) && emptyGrouped[slot].length === 0),
  );

  console.log('--- 4. mapEquipResult: 200/404/409/network/otro -- mapeo puro, sin repetir reglas de negocio del backend (5.b) ---');
  const equipped = makeSummary();
  const okResult: ApiResult<CosmeticSummary> = { ok: true, data: equipped };
  const okOutcome = mapEquipResult(okResult);
  check('200 -> kind "ok" con los datos del servidor (nunca optimista)', okOutcome.kind === 'ok' && okOutcome.data === equipped);

  const notFound: ApiResult<CosmeticSummary> = { ok: false, kind: 'http', status: 404, message: 'no existe' };
  check('404 -> kind "reload" (reconciliar recargando TODO, no adivinar)', mapEquipResult(notFound).kind === 'reload');

  const conflict: ApiResult<CosmeticSummary> = { ok: false, kind: 'http', status: 409, message: 'ese cosmético ya no está disponible' };
  const conflictOutcome = mapEquipResult(conflict);
  check(
    '409 -> kind "conflict" con el mensaje del backend preservado -- la pantalla debe conservar el equipamiento anterior',
    conflictOutcome.kind === 'conflict' && conflictOutcome.message === 'ese cosmético ya no está disponible',
  );

  const network: ApiResult<CosmeticSummary> = { ok: false, kind: 'network', message: 'sin conexión' };
  check('sin red -> kind "network" -- la pantalla debe conservar el equipamiento anterior y permitir reintento', mapEquipResult(network).kind === 'network');

  const otherHttp: ApiResult<CosmeticSummary> = { ok: false, kind: 'http', status: 500, message: 'error inesperado' };
  const otherOutcome = mapEquipResult(otherHttp);
  check('otro status HTTP -> kind "error", status preservado', otherOutcome.kind === 'error' && otherOutcome.status === 500);

  console.log('--- 5. Sin lógica duplicada del backend: el mapeo es puramente HTTP status -> intención de UI ---');
  // Verificación por diseño, no por inspección de texto: mapEquipResult no
  // recibe ni necesita `itemType`/`cosmeticSlot`/propiedad para decidir su
  // resultado -- solo el status HTTP ya decidido por el backend (5.b).
  const conflictNoBusinessFields = mapEquipResult({ ok: false, kind: 'http', status: 409, message: 'x' });
  check('el mapeo de 409 no requiere ni infiere el slot/tipo real -- delega la verdad al backend', conflictNoBusinessFields.kind === 'conflict');

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Cosméticos (móvil, Bloque III, sub-incremento 5.c) pasaron.');
  console.log('');
  console.log('RECORDATORIO: esto valida group-cosmetics.ts/equip-outcome.ts (lógica pura), no la pantalla React');
  console.log('Native en sí (renderizado, tema claro/oscuro, doble toque real por slot). Verificación manual');
  console.log('complementaria en Android (claro/oscuro) pendiente antes del cierre de Bloque III -- ver');
  console.log('docs/adr/BLOCK-III-DEFINITION.md §4.21.');
}

main();
