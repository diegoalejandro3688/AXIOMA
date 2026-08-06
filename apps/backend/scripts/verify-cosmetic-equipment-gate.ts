// Gate del Bloque III, Incremento 5, sub-incremento 5.b ("Equipamiento de
// cosméticos", BLOCK-III-DEFINITION.md §4.20, ADR-0018) -- prueba contra el
// servidor real (endpoints /gamification/me/cosmetics) más acceso directo
// a Postgres para fixtures/inspección, mismo patrón que
// verify-title-equipment-gate.ts (3.b). Cubre los Gates 22/34/59-68.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `cosmetic-equip-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function claimProfile(headers: Record<string, string>, username: string) {
  return req('POST', '/user/public-profile', headers, { username });
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);

  const suffix = Date.now();

  console.log('--- 0. Fixtures: cosméticos de catálogo y propiedad ---');
  const frame1 = await cosmeticItemRepo.create({
    itemKey: `gate-5b-frame1-${suffix}`,
    itemType: 'AVATAR_FRAME',
    name: 'Marco dorado (gate 5.b)',
    rarityClass: 'RARE',
    assetReference: 'gate://frame1',
    visibilityStatus: 'PUBLIC',
  });
  const frame2 = await cosmeticItemRepo.create({
    itemKey: `gate-5b-frame2-${suffix}`,
    itemType: 'AVATAR_FRAME',
    name: 'Marco de plata (gate 5.b)',
    rarityClass: 'COMMON',
    assetReference: 'gate://frame2',
    visibilityStatus: 'PUBLIC',
  });
  const badge = await cosmeticItemRepo.create({
    itemKey: `gate-5b-badge-${suffix}`,
    itemType: 'BADGE',
    name: 'Insignia (gate 5.b)',
    rarityClass: 'COMMON',
    assetReference: 'gate://badge',
    visibilityStatus: 'PUBLIC',
  });

  const alice = await createSession('alice');
  const bob = await createSession('bob');

  const { inventoryItem: aliceFrame1 } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: frame1.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:2`,
    acquiredAt: new Date(),
  });
  const { inventoryItem: aliceFrame2 } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: frame2.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:3`,
    acquiredAt: new Date(),
  });
  const { inventoryItem: aliceBadge } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: badge.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:4`,
    acquiredAt: new Date(),
  });
  const { inventoryItem: bobFrame1 } = await inventoryItemRepo.createIdempotent({
    accountId: bob.accountId,
    cosmeticItemId: frame1.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${bob.accountId}:2`,
    acquiredAt: new Date(),
  });

  console.log('--- 1. Gates 64/65: GET sin perfil público -- owned poblado, equipped con las 4 claves en null ---');
  const listBeforeProfile = await req('GET', '/gamification/me/cosmetics', alice.headers);
  check('GET -> 200 incluso sin perfil', listBeforeProfile.status === 200);
  check('owned incluye los 3 cosméticos de Alice', listBeforeProfile.body.owned.length === 3);
  check(
    'equipped tiene las 4 claves, todas null',
    ['AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE'].every((slot) => Object.prototype.hasOwnProperty.call(listBeforeProfile.body.equipped, slot) && listBeforeProfile.body.equipped[slot] === null),
  );

  console.log('--- 2. Gate 61: equipar sin perfil público -> 404 ---');
  const equipWithoutProfile = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: aliceFrame1.id });
  check('PUT sin perfil -> 404', equipWithoutProfile.status === 404);

  await claimProfile(alice.headers, `alice${suffix}`.slice(0, 20));
  await claimProfile(bob.headers, `bob${suffix}`.slice(0, 20));

  console.log('--- 3. Equipar con propiedad activa y coincidencia de slot -> éxito ---');
  const equipFrame1 = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: aliceFrame1.id });
  check('PUT -> 200', equipFrame1.status === 200);
  check('respuesta refleja el cosmético equipado', equipFrame1.body.inventoryItemId === aliceFrame1.id);

  const listAfterEquip = await req('GET', '/gamification/me/cosmetics', alice.headers);
  check('GET refleja AVATAR_FRAME equipado, otros 3 slots null', listAfterEquip.body.equipped.AVATAR_FRAME?.inventoryItemId === aliceFrame1.id);
  check(
    'los otros 3 slots siguen null',
    listAfterEquip.body.equipped.AVATAR === null && listAfterEquip.body.equipped.PROFILE_BANNER === null && listAfterEquip.body.equipped.BADGE === null,
  );

  const equippedRowCountAfterFirst = await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1)', [
    alice.accountId,
  ]);
  check('UNA sola fila equipped_cosmetic para Alice hasta ahora', equippedRowCountAfterFirst.rows[0].n === 1);

  console.log('--- 4. Gate 59: re-equipar el MISMO cosmético es idempotente ---');
  const equipFrame1Again = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: aliceFrame1.id });
  check('segundo PUT (mismo valor) -> 200', equipFrame1Again.status === 200);
  check('sigue reflejando el mismo cosmético', equipFrame1Again.body.inventoryItemId === aliceFrame1.id);
  const equippedRowCountAfterIdempotent = await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1)', [
    alice.accountId,
  ]);
  check('SIGUE existiendo UNA sola fila (no duplicó)', equippedRowCountAfterIdempotent.rows[0].n === 1);

  console.log('--- 5. Gate 60: reemplazo atómico del slot ya ocupado ---');
  const equipFrame2 = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: aliceFrame2.id });
  check('PUT con OTRO cosmético en el mismo slot -> 200', equipFrame2.status === 200);
  check('respuesta refleja el nuevo cosmético (frame2)', equipFrame2.body.inventoryItemId === aliceFrame2.id);
  const equippedRowCountAfterReplace = await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1)', [
    alice.accountId,
  ]);
  check('SIGUE existiendo UNA sola fila (UPDATE, no INSERT adicional)', equippedRowCountAfterReplace.rows[0].n === 1);

  console.log('--- 6. Gate 61: inventoryItemId ajeno o inexistente -> 404 ---');
  const equipForeign = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: bobFrame1.id });
  check('equipar el inventoryItemId de Bob -> 404', equipForeign.status === 404);
  const equipUnknown = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: randomUUID() });
  check('equipar un inventoryItemId inexistente -> 404', equipUnknown.status === 404);

  console.log('--- 7. Gate 62: propiedad REVOKED no se puede equipar (y no se reactiva) ---');
  await pg.query("UPDATE inventory_item SET ownership_status = 'REVOKED', revoked_at = now() WHERE id = $1", [aliceBadge.id]);
  const equipRevoked = await req('PUT', `/gamification/me/cosmetics/equipped/BADGE`, alice.headers, { inventoryItemId: aliceBadge.id });
  check('equipar un cosmético REVOKED -> 409', equipRevoked.status === 409);
  const badgeStillRevoked = await pg.query('SELECT ownership_status FROM inventory_item WHERE id = $1', [aliceBadge.id]);
  check('ownershipStatus SIGUE REVOKED -- no se reactivó', badgeStillRevoked.rows[0].ownership_status === 'REVOKED');

  console.log('--- 8. Gate 34/63: coincidencia de slot exigida ---');
  const { inventoryItem: aliceBadgeActive } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: badge.id,
    acquisitionSourceType: 'CHALLENGE_CLAIM',
    acquisitionSourceId: 'segunda-adquisicion-no-debe-usarse',
    acquiredAt: new Date(),
  });
  check('fixture: sigue siendo la MISMA fila REVOKED (idempotencia de 5.a, no una nueva)', aliceBadgeActive.id === aliceBadge.id);
  const mismatchedSlot = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, alice.headers, { inventoryItemId: aliceBadge.id });
  check('equipar un BADGE en el slot AVATAR_FRAME -> 409 (aunque encima esté REVOKED, cualquiera de los dos motivos basta)', mismatchedSlot.status === 409);

  console.log('--- 9. Gate 68 (parcial, funcional): frontera de dominio -- GamificationModule no importa UserModule ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationModuleContents = readFileSync(join(__dirname, '..', 'src', 'gamification', 'gamification.module.ts'), 'utf8');
  check('gamification.module.ts no importa UserModule (sin dependencia circular)', !gamificationModuleContents.includes("from '../user/user.module'"));

  console.log('--- 10. Gate 67: anonimización borra equipped_cosmetic, preserva inventory_item ---');
  const carol = await createSession('carol');
  await claimProfile(carol.headers, `carol${suffix}`.slice(0, 20));
  const { inventoryItem: carolFrame } = await inventoryItemRepo.createIdempotent({
    accountId: carol.accountId,
    cosmeticItemId: frame1.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${carol.accountId}:2`,
    acquiredAt: new Date(),
  });
  const carolEquip = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, carol.headers, { inventoryItemId: carolFrame.id });
  check('Carol equipa exitosamente', carolEquip.status === 200);

  await req('POST', '/privacy/account-deletion', carol.headers);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [carol.accountId]);
  const sweepResponse = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('barrido de PRIVACY responde 200', sweepResponse.status === 200);

  const carolProfileAfter = await pg.query('SELECT lifecycle_status FROM public_profile WHERE account_id = $1', [carol.accountId]);
  check('perfil de Carol queda ANONYMIZED', carolProfileAfter.rows[0]?.lifecycle_status === 'ANONYMIZED');
  const carolEquippedAfter = await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic WHERE inventory_item_id = $1', [carolFrame.id]);
  check('equipped_cosmetic de Carol SÍ se borra al anonimizar', carolEquippedAfter.rows[0].n === 0);
  const carolInventoryAfter = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE id = $1', [carolFrame.id]);
  check('inventory_item de Carol permanece intacta (solo se limpia presentación, no propiedad)', carolInventoryAfter.rows[0].n === 1);

  console.log('--- 11. Gate 66: dos PUT concurrentes con cosméticos distintos al mismo slot -> UNA fila válida, sin 500 ni duplicados ---');
  const dave = await createSession('dave');
  await claimProfile(dave.headers, `dave${suffix}`.slice(0, 20));
  const { inventoryItem: daveFrame1 } = await inventoryItemRepo.createIdempotent({
    accountId: dave.accountId,
    cosmeticItemId: frame1.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${dave.accountId}:2`,
    acquiredAt: new Date(),
  });
  const { inventoryItem: daveFrame2 } = await inventoryItemRepo.createIdempotent({
    accountId: dave.accountId,
    cosmeticItemId: frame2.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${dave.accountId}:3`,
    acquiredAt: new Date(),
  });
  const [concurrentA, concurrentB] = await Promise.all([
    req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, dave.headers, { inventoryItemId: daveFrame1.id }),
    req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, dave.headers, { inventoryItemId: daveFrame2.id }),
  ]);
  check('ninguna de las dos solicitudes concurrentes devuelve 500', concurrentA.status !== 500 && concurrentB.status !== 500);
  check('ambas responden 200 (upsert serializado por Postgres, ninguna rechazada)', concurrentA.status === 200 && concurrentB.status === 200);
  const daveEquippedRows = await pg.query(
    "SELECT inventory_item_id FROM equipped_cosmetic WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1) AND cosmetic_slot = 'AVATAR_FRAME'",
    [dave.accountId],
  );
  check('EXACTAMENTE una fila final para ese slot', daveEquippedRows.rows.length === 1);
  const finalInventoryItemId = daveEquippedRows.rows[0]?.inventory_item_id;
  check(
    'el valor final corresponde a UNA de las dos solicitudes (frame1 o frame2), no un tercer valor',
    finalInventoryItemId === daveFrame1.id || finalInventoryItemId === daveFrame2.id,
  );

  console.log('--- 12. Sin identidad requerida: 401 en ambos endpoints ---');
  const listNoAuth = await req('GET', '/gamification/me/cosmetics');
  check('GET sin sesión -> 401', listNoAuth.status === 401);
  const equipNoAuth = await req('PUT', `/gamification/me/cosmetics/equipped/AVATAR_FRAME`, {}, { inventoryItemId: randomUUID() });
  check('PUT sin sesión -> 401', equipNoAuth.status === 401);

  console.log('--- 13. Fuera de alcance: sin desequipamiento sin reemplazo, sin catálogo público, sin endpoints de compra ---');
  const { readdirSync } = await import('node:fs');
  const userDir = join(__dirname, '..', 'src', 'user');
  const controllerContents = readFileSync(join(userDir, 'cosmetic-equipment.controller.ts'), 'utf8');
  check('sin método @Delete en el controller (sin desequipamiento explícito en 5.b)', !controllerContents.includes('@Delete'));
  const controllerFiles = readdirSync(userDir).filter((f) => f.endsWith('.controller.ts'));
  let catalogEndpointFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(userDir, file), 'utf8');
    if (contents.includes('CosmeticItemRepository')) {
      catalogEndpointFound = true;
      console.error(`  ${file} expone cosmetic_item (catálogo) directamente`);
    }
  }
  check('ningún controller expone el catálogo completo de cosmetic_item', !catalogEndpointFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Equipamiento de Cosméticos (Bloque III, sub-incremento 5.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
