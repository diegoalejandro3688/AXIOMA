// Gate del Bloque III, Incremento 3, sub-incremento 3.b ("Equipamiento de
// títulos", BLOCK-III-DEFINITION.md, ADR-0018) -- prueba contra el
// servidor real (endpoints /user/public-profile/equipped-title) más
// acceso directo a Postgres para fixtures/inspección, mismo patrón que
// verify-public-profile-gate.ts. Cubre los Gates 13-15 del Incremento 3
// más la coordinación con public_profile (retiro/anonimización) y el
// desequipamiento atómico al revocar.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { EquippedTitleRepository } from '../src/gamification/equipped-title.repository';
import { TitleEquipmentService } from '../src/gamification/title-equipment.service';
import { CosmeticEquipmentService } from '../src/gamification/cosmetic-equipment.service';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { UserService } from '../src/user/user.service';
import { UserProfileRepository } from '../src/user/user-profile.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
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
  const uid = `title-equip-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
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

  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const titleEquipmentService = new TitleEquipmentService(accountTitleRepo, titleDefinitionRepo, new EquippedTitleRepository(prisma));
  // UserService exige CosmeticEquipmentService desde 5.b -- este gate no ejercita
  // cosméticos, pero el constructor real de producción sí lo requiere.
  const cosmeticEquipmentService = new CosmeticEquipmentService(
    new InventoryItemRepository(prisma),
    new CosmeticItemRepository(prisma),
    new EquippedCosmeticRepository(prisma),
  );
  const userService = new UserService(new UserProfileRepository(prisma), new PublicProfileRepository(prisma), titleEquipmentService, cosmeticEquipmentService);

  const suffix = Date.now();

  const publicTitle = await titleDefinitionRepo.create({
    titleKey: `title-equip-gate-public-${suffix}`,
    displayText: 'Explorador incansable',
    rarityClass: 'RARE',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PUBLIC',
  });
  const privateTitle = await titleDefinitionRepo.create({
    titleKey: `title-equip-gate-private-${suffix}`,
    displayText: 'Título privado (no elegible)',
    rarityClass: 'COMMON',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PRIVATE',
  });

  console.log('--- 1. Gate 13: equipar sin public_profile existente -> rechazado ---');
  const alice = await createSession('alice');
  const { accountTitle: aliceOwnedTitle } = await accountTitleRepo.createIdempotent({
    accountId: alice.accountId,
    titleDefinitionId: publicTitle.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:2`,
    acquiredAt: new Date(),
  });
  const equipWithoutProfile = await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: aliceOwnedTitle.id });
  check('PATCH equipped-title sin perfil -> 404', equipWithoutProfile.status === 404);

  console.log('--- 2. Equipar con propiedad activa y definición pública -> éxito (perfil PRIVATE por defecto) ---');
  const aliceClaim = await claimProfile(alice.headers, `alice${suffix}`.slice(0, 20));
  check('perfil creado (201)', aliceClaim.status === 201);
  check('perfil nace PRIVATE', aliceClaim.body.visibilityStatus === 'PRIVATE');

  const equipSuccess = await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: aliceOwnedTitle.id });
  check('PATCH equipped-title -> 200', equipSuccess.status === 200);
  check('respuesta incluye displayText del título', equipSuccess.body.displayText === 'Explorador incansable');
  check('respuesta incluye accountTitleId correcto', equipSuccess.body.accountTitleId === aliceOwnedTitle.id);

  const getEquipped = await req('GET', '/user/public-profile/equipped-title', alice.headers);
  check('GET equipped-title -> 200, refleja lo equipado', getEquipped.status === 200 && getEquipped.body.accountTitleId === aliceOwnedTitle.id);

  const equippedRowAlice = await pg.query('SELECT * FROM equipped_title WHERE account_title_id = $1', [aliceOwnedTitle.id]);
  check('fila equipped_title persistida', equippedRowAlice.rows.length === 1);

  console.log('--- 3. Perfil PRIVATE conserva el equipamiento (visibilidad no es condición para equipar) ---');
  const aliceProfileAfterEquip = await pg.query('SELECT visibility_status FROM public_profile WHERE account_id = $1', [alice.accountId]);
  check('visibilityStatus sigue PRIVATE tras equipar (nunca se exige VISIBLE)', aliceProfileAfterEquip.rows[0].visibility_status === 'PRIVATE');
  const equippedStillThere = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id = $1', [aliceOwnedTitle.id]);
  check('la fila sigue existiendo con el perfil en PRIVATE', equippedStillThere.rows[0].n === 1);

  console.log('--- 4. Gate 15: equipar es una operación de presentación pura ---');
  const accountTitleCountBefore = (await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1', [alice.accountId])).rows[0]
    .n as number;
  const xpBalanceBefore = (await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [alice.accountId])).rows[0].n as number;
  const achievementProgressBefore = (
    await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE account_id = $1', [alice.accountId])
  ).rows[0].n as number;
  await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: aliceOwnedTitle.id });
  const accountTitleCountAfter = (await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1', [alice.accountId])).rows[0]
    .n as number;
  const xpBalanceAfter = (await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [alice.accountId])).rows[0].n as number;
  const achievementProgressAfter = (
    await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE account_id = $1', [alice.accountId])
  ).rows[0].n as number;
  check('re-equipar el MISMO título no crea una segunda account_title', accountTitleCountAfter === accountTitleCountBefore);
  check('equipar no crea/toca xp_balance', xpBalanceAfter === xpBalanceBefore);
  check('equipar no crea/toca achievement_progress', achievementProgressAfter === achievementProgressBefore);

  console.log('--- 5. Gate 14: título ajeno -> 404 (no se filtra su existencia) ---');
  const bob = await createSession('bob');
  await claimProfile(bob.headers, `bob${suffix}`.slice(0, 20));
  const equipForeignTitle = await req('PATCH', '/user/public-profile/equipped-title', bob.headers, { accountTitleId: aliceOwnedTitle.id });
  check('equipar un account_title de OTRA cuenta -> 404', equipForeignTitle.status === 404);

  console.log('--- 6. Gate 14: definición retirada/privada -> rechazado ---');
  const { accountTitle: bobPrivateTitle } = await accountTitleRepo.createIdempotent({
    accountId: bob.accountId,
    titleDefinitionId: privateTitle.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${bob.accountId}:3`,
    acquiredAt: new Date(),
  });
  const equipPrivateDefinition = await req('PATCH', '/user/public-profile/equipped-title', bob.headers, { accountTitleId: bobPrivateTitle.id });
  check('equipar un título con visibility_status=PRIVATE -> 409', equipPrivateDefinition.status === 409);

  console.log('--- 7. Gate 14: propiedad revocada -> rechazado, y desequipamiento atómico si ya estaba equipado ---');
  const carol = await createSession('carol');
  await claimProfile(carol.headers, `carol${suffix}`.slice(0, 20));
  const { accountTitle: carolTitle } = await accountTitleRepo.createIdempotent({
    accountId: carol.accountId,
    titleDefinitionId: publicTitle.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${carol.accountId}:2`,
    acquiredAt: new Date(),
  });
  const carolEquip = await req('PATCH', '/user/public-profile/equipped-title', carol.headers, { accountTitleId: carolTitle.id });
  check('Carol equipa exitosamente antes de la revocación', carolEquip.status === 200);

  await pg.query("UPDATE account_title SET ownership_status = 'REVOKED', revoked_at = now() WHERE id = $1", [carolTitle.id]);
  const carolEquippedAfterRevoke = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id = $1', [carolTitle.id]);
  check('trigger desequipa atómicamente al revocar (fila equipped_title eliminada)', carolEquippedAfterRevoke.rows[0].n === 0);
  const carolAccountTitleStillExists = await pg.query('SELECT ownership_status FROM account_title WHERE id = $1', [carolTitle.id]);
  check('la propiedad (account_title) sigue existiendo, solo REVOKED -- no se borra', carolAccountTitleStillExists.rows[0].ownership_status === 'REVOKED');

  const equipRevokedTitle = await req('PATCH', '/user/public-profile/equipped-title', carol.headers, { accountTitleId: carolTitle.id });
  check('intentar equipar un título ya REVOKED -> 409', equipRevokedTitle.status === 409);

  console.log('--- 8. Perfil RETIRED no admite una nueva selección, pero conserva la ya equipada ---');
  const dave = await createSession('dave');
  await claimProfile(dave.headers, `dave${suffix}`.slice(0, 20));
  const { accountTitle: daveTitle } = await accountTitleRepo.createIdempotent({
    accountId: dave.accountId,
    titleDefinitionId: publicTitle.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${dave.accountId}:2`,
    acquiredAt: new Date(),
  });
  const daveEquipBeforeRetire = await req('PATCH', '/user/public-profile/equipped-title', dave.headers, { accountTitleId: daveTitle.id });
  check('Dave equipa exitosamente antes de retirarse', daveEquipBeforeRetire.status === 200);

  await req('POST', '/privacy/account-deletion', dave.headers);
  const daveProfileAfterRetire = await pg.query('SELECT lifecycle_status FROM public_profile WHERE account_id = $1', [dave.accountId]);
  check('perfil de Dave queda RETIRED', daveProfileAfterRetire.rows[0].lifecycle_status === 'RETIRED');
  const daveEquippedStillThereAfterRetire = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id = $1', [daveTitle.id]);
  check('equipped_title de Dave NO se borra al retirarse (solo queda sin exponer)', daveEquippedStillThereAfterRetire.rows[0].n === 1);

  // La sesión HTTP de Dave quedó revocada al solicitar el cierre (mismo
  // criterio que verify-public-profile-gate.ts) -- se prueba a nivel de
  // servicio, directamente, sin pasar por AuthGuard.
  let equipAfterRetireRejected = false;
  try {
    await userService.equipTitle(dave.accountId, daveTitle.id);
  } catch (error) {
    equipAfterRetireRejected = error instanceof Error && error.message.includes('no está activa');
  }
  check('con el perfil RETIRED, un nuevo intento de equipar es rechazado (ConflictException)', equipAfterRetireRejected);

  console.log('--- 9. Anonimización borra equipped_title, preserva account_title ---');
  const erin = await createSession('erin');
  await claimProfile(erin.headers, `erin${suffix}`.slice(0, 20));
  const { accountTitle: erinTitle } = await accountTitleRepo.createIdempotent({
    accountId: erin.accountId,
    titleDefinitionId: publicTitle.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${erin.accountId}:2`,
    acquiredAt: new Date(),
  });
  const erinEquip = await req('PATCH', '/user/public-profile/equipped-title', erin.headers, { accountTitleId: erinTitle.id });
  check('Erin equipa exitosamente', erinEquip.status === 200);

  await req('POST', '/privacy/account-deletion', erin.headers);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [erin.accountId]);
  const sweepResponse = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('barrido de PRIVACY responde 200', sweepResponse.status === 200);

  const erinProfileAfterAnonymize = await pg.query('SELECT lifecycle_status FROM public_profile WHERE account_id = $1', [erin.accountId]);
  check('perfil de Erin queda ANONYMIZED', erinProfileAfterAnonymize.rows[0]?.lifecycle_status === 'ANONYMIZED');
  const erinEquippedAfterAnonymize = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id = $1', [erinTitle.id]);
  check('equipped_title de Erin SÍ se borra al anonimizar', erinEquippedAfterAnonymize.rows[0].n === 0);
  const erinAccountTitleAfterAnonymize = await pg.query('SELECT count(*)::int AS n FROM account_title WHERE id = $1', [erinTitle.id]);
  check('account_title de Erin permanece intacta (solo se limpia presentación, no propiedad)', erinAccountTitleAfterAnonymize.rows[0].n === 1);

  console.log('--- 10. Quitar el título equipado (accountTitleId: null) es una acción explícita válida ---');
  const unequip = await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: null });
  check('PATCH {accountTitleId: null} -> 200', unequip.status === 200);
  const aliceEquippedAfterUnequip = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1)', [alice.accountId]);
  check('fila equipped_title eliminada tras quitar', aliceEquippedAfterUnequip.rows[0].n === 0);
  const unequipAgain = await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: null });
  check('quitar de nuevo cuando ya no hay nada equipado -> 200 (no-op seguro, no error)', unequipAgain.status === 200);

  console.log('--- 11. Sin identidad requerida: llamar sin sesión -> 401 ---');
  const noSession = await req('PATCH', '/user/public-profile/equipped-title', {}, { accountTitleId: null });
  check('PATCH equipped-title sin sesión -> 401', noSession.status === 401);

  console.log('--- 12. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const titleEquipmentServiceContents = readFileSync(join(__dirname, '..', 'src', 'gamification', 'title-equipment.service.ts'), 'utf8');
  check(
    'TitleEquipmentService no importa PublicProfileRepository (esa validación de lifecycleStatus vive en UserService)',
    !titleEquipmentServiceContents.includes('PublicProfileRepository'),
  );

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Equipamiento de Títulos (Bloque III, sub-incremento 3.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
