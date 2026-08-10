// Gate del LEF Bloque V, Incremento 2 ("Visibilidad granular -- insignias
// destacadas") -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md §10. Prueba
// contra el servidor real (GET/PATCH /user/public-profile/featured-achievements,
// GET /user/public-profile/:username/competitive-profile) más acceso
// directo a Postgres para fixtures, inspección, y para probar los
// triggers de base de datos de forma AISLADA (sin pasar por la
// aplicación) -- mismo patrón que verify-cosmetic-equipment-gate.ts y
// verify-league-season-foundation-gate.ts (§9.9).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
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
  const uid = `feat-ach-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);

  const suffix = Date.now();

  async function makePublicAchievement(label: string) {
    const def = await achievementDefinitionRepo.create({
      achievementKey: `feat-gate-${label}-${suffix}`,
      name: `Logro público ${label}`,
      achievementCategory: 'XP',
      visibilityClass: 'PUBLIC',
      repeatability: 'UNIQUE',
      progressTrackingType: 'XP_THRESHOLD',
    });
    const version = await achievementVersionRepo.create({
      achievementDefinitionId: def.id,
      versionLabel: `v1-${suffix}`,
      unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
    });
    return { def, version };
  }

  async function unlock(
    accountId: string,
    def: { id: string },
    version: { id: string },
    status: 'ACTIVE' | 'REVERSED' = 'ACTIVE',
    unlockInstance = 1,
  ): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status)
       VALUES ($1, $2, $3, $4, $5, now(), $6)`,
      [id, accountId, def.id, version.id, unlockInstance, status],
    );
    return id;
  }

  async function claimProfile(headers: Record<string, string>, username: string) {
    const res = await req('POST', '/user/public-profile', headers, { username });
    if (res.status !== 200 && res.status !== 201) throw new Error(`No se pudo crear public_profile: ${res.status} ${res.raw}`);
    return res;
  }

  console.log('--- 0. Fixtures: catálogo (6 logros públicos, 1 privado), dos cuentas, perfil VISIBLE ---');
  const aliceUsername = `fa_${suffix}`.slice(0, 20);
  const alice = await createSession('alice');
  await claimProfile(alice.headers, aliceUsername);
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });

  const bob = await createSession('bob');
  await claimProfile(bob.headers, `fb_${suffix}`.slice(0, 20));

  const [a1, a2, a3, a4, a5, a6] = await Promise.all([
    makePublicAchievement('a1'),
    makePublicAchievement('a2'),
    makePublicAchievement('a3'),
    makePublicAchievement('a4'),
    makePublicAchievement('a5'),
    makePublicAchievement('a6'),
  ]);
  const privateDef = await achievementDefinitionRepo.create({
    achievementKey: `feat-gate-private-${suffix}`,
    name: 'Logro privado',
    achievementCategory: 'XP',
    visibilityClass: 'PRIVATE',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const privateVersion = await achievementVersionRepo.create({
    achievementDefinitionId: privateDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
  });

  const unlockA1 = await unlock(alice.accountId, a1.def, a1.version);
  const unlockA2 = await unlock(alice.accountId, a2.def, a2.version);
  const unlockA3 = await unlock(alice.accountId, a3.def, a3.version);
  const unlockA4 = await unlock(alice.accountId, a4.def, a4.version); // NUNCA destacado en las pruebas 1-8 -- usado para "no se filtra"
  const unlockA5 = await unlock(alice.accountId, a5.def, a5.version); // reservado para el conjunto B de la prueba de concurrencia
  const unlockA6 = await unlock(alice.accountId, a6.def, a6.version); // reservado para el conjunto B de la prueba de concurrencia
  const unlockAPrivate = await unlock(alice.accountId, privateDef, privateVersion); // logro ACTIVE pero PRIVATE -- nunca destacable
  const unlockAReversed = await unlock(alice.accountId, a1.def, a1.version, 'REVERSED', 2); // unlockInstance=2 -- distinta fila de unlockA1 (instance=1), evita choque con @@unique([accountId, achievementDefinitionId, unlockInstance])
  const unlockBob = await unlock(bob.accountId, a2.def, a2.version); // logro de OTRA cuenta

  check('fixtures creados sin errores', true);

  console.log('--- 1. 0 insignias: GET vacío antes de cualquier selección ---');
  const getEmpty = await req('GET', '/user/public-profile/featured-achievements', alice.headers);
  check('GET -> 200', getEmpty.status === 200);
  check('featured == [] (sin selección todavía)', Array.isArray(getEmpty.body?.featured) && getEmpty.body.featured.length === 0);

  console.log('--- 1.1 PATCH con selección vacía -> respuesta válida vacía, sin error ---');
  const putEmpty = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [] });
  check('PATCH [] -> 200', putEmpty.status === 200);
  check('featured == [] ', putEmpty.body?.featured.length === 0);

  console.log('--- 2. Seleccionar 1 -> aparece EXACTAMENTE esa ---');
  const putOne = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA1] });
  check('PATCH [1] -> 200', putOne.status === 200);
  check('featured tiene exactamente 1 elemento', putOne.body?.featured.length === 1);
  check('el elemento es unlockA1', putOne.body?.featured[0]?.achievementUnlockId === unlockA1);
  check('displayOrder == 0', putOne.body?.featured[0]?.displayOrder === 0);
  check('achievementKey/name correctos', putOne.body?.featured[0]?.achievementKey === a1.def.achievementKey && putOne.body?.featured[0]?.name === a1.def.name);

  console.log('--- 3. Seleccionar 3 -> aparecen EXACTAMENTE esas 3, en el orden enviado ---');
  const putThree = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA2, unlockA3, unlockA1] });
  check('PATCH [3] -> 200', putThree.status === 200);
  check('featured tiene exactamente 3 elementos', putThree.body?.featured.length === 3);
  const threeIds = (putThree.body?.featured ?? []).map((f: { achievementUnlockId: string }) => f.achievementUnlockId);
  check('orden exacto [A2, A3, A1] preservado (displayOrder 0,1,2)', JSON.stringify(threeIds) === JSON.stringify([unlockA2, unlockA3, unlockA1]));
  check('displayOrder consecutivo 0,1,2', JSON.stringify((putThree.body?.featured ?? []).map((f: { displayOrder: number }) => f.displayOrder)) === JSON.stringify([0, 1, 2]));

  console.log('--- 4. Intentar seleccionar una CUARTA -> rechazo (400), estado previo intacto ---');
  const putFour = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, {
    achievementUnlockIds: [unlockA1, unlockA2, unlockA3, unlockA4],
  });
  check('PATCH con 4 elementos -> 400 (contrato Zod, max 3)', putFour.status === 400);
  const afterFour = await req('GET', '/user/public-profile/featured-achievements', alice.headers);
  const afterFourIds = (afterFour.body?.featured ?? []).map((f: { achievementUnlockId: string }) => f.achievementUnlockId);
  check('estado previo INTACTO tras el rechazo (sigue [A2, A3, A1])', JSON.stringify(afterFourIds) === JSON.stringify([unlockA2, unlockA3, unlockA1]));

  console.log('--- 5. Badge no obtenida / ajena / revocada / privada -> rechazo, estado previo intacto ---');
  const putNonexistent = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [randomUUID()] });
  check('achievementUnlockId inexistente -> 404', putNonexistent.status === 404);

  const putOthers = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockBob] });
  check('achievementUnlockId de OTRA cuenta -> 404 (nunca revela que existe)', putOthers.status === 404);

  const putReversed = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockAReversed] });
  check('achievementUnlockId REVERSED (no ACTIVE) -> 409', putReversed.status === 409);

  const putPrivate = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockAPrivate] });
  check('achievementUnlockId de un logro PRIVATE -> 409 (nunca destacable públicamente)', putPrivate.status === 409);

  const afterRejections = await req('GET', '/user/public-profile/featured-achievements', alice.headers);
  const afterRejectionsIds = (afterRejections.body?.featured ?? []).map((f: { achievementUnlockId: string }) => f.achievementUnlockId);
  check('estado previo INTACTO tras los 4 rechazos (sigue [A2, A3, A1])', JSON.stringify(afterRejectionsIds) === JSON.stringify([unlockA2, unlockA3, unlockA1]));

  console.log('--- 6. Duplicado -> rechazo (400), sin duplicar ni dejar estado inválido ---');
  const putDuplicate = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA1, unlockA1] });
  check('selección con el mismo id repetido -> 400 (contrato Zod, refine de unicidad)', putDuplicate.status === 400);
  const afterDuplicate = await req('GET', '/user/public-profile/featured-achievements', alice.headers);
  check('estado previo INTACTO tras el rechazo por duplicado', afterDuplicate.body?.featured.length === 3);
  const dupRows = await pg.query(
    "SELECT COUNT(*) FROM public_profile_featured_achievement WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1)",
    [alice.accountId],
  );
  check('exactamente 3 filas en base de datos (sin duplicado colado)', Number(dupRows.rows[0].count) === 3);

  console.log('--- 7. Retirar una destacada -> deja de ser pública, pero SIGUE en el inventario (achievement_unlock intacto) ---');
  const putTwo = await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA2, unlockA1] });
  check('PATCH [A2, A1] (quita A3) -> 200', putTwo.status === 200);
  const twoIds = (putTwo.body?.featured ?? []).map((f: { achievementUnlockId: string }) => f.achievementUnlockId);
  check('featured == [A2, A1] exactamente (A3 ya no está)', JSON.stringify(twoIds) === JSON.stringify([unlockA2, unlockA1]));
  const unlockA3Row = await pg.query("SELECT status FROM achievement_unlock WHERE id = $1", [unlockA3]);
  check('achievement_unlock de A3 SIGUE existiendo y ACTIVE (retirar de destacados no revoca el logro)', unlockA3Row.rows[0]?.status === 'ACTIVE');

  console.log('--- 8. Ninguna otra insignia poseída (A4, privada) se filtra en la selección ---');
  const featuredRaw = JSON.stringify(putTwo.body);
  check('A4 (poseída, nunca destacada) no aparece en la respuesta de featured', !featuredRaw.includes(unlockA4));
  check('el logro privado no aparece en la respuesta de featured', !featuredRaw.includes(unlockAPrivate) && !featuredRaw.includes(privateDef.achievementKey));

  console.log('--- 9. Superficie pública devuelve ÚNICAMENTE la selección actual ---');
  const publicProfile = await req('GET', `/user/public-profile/${aliceUsername}/competitive-profile`, bob.headers);
  check('endpoint público -> 200', publicProfile.status === 200);
  const publicFeatured = (publicProfile.body?.featuredAchievements ?? []).map((f: { achievementKey: string }) => f.achievementKey);
  check(
    'featuredAchievements público == EXACTAMENTE [A2, A1] (mismo orden, mismos 2 elementos)',
    JSON.stringify(publicFeatured) === JSON.stringify([a2.def.achievementKey, a1.def.achievementKey]),
  );
  check('A3/A4 (poseídas, no destacadas actualmente) NO aparecen en featuredAchievements público', !JSON.stringify(publicProfile.body?.featuredAchievements).includes(a3.def.achievementKey) && !JSON.stringify(publicProfile.body?.featuredAchievements).includes(a4.def.achievementKey));
  check('publicAchievements (whitelist ya existente, sin cambio) sigue incluyendo TODOS los logros públicos, no solo los destacados', (publicProfile.body?.publicAchievements ?? []).length >= 6);

  console.log('--- 10. Elegibilidad re-evaluada en lectura: un logro destacado que pasa a PRIVATE deja de mostrarse sin quitar la selección ---');
  await pg.query("UPDATE achievement_definition SET visibility_class = 'PRIVATE' WHERE id = $1", [a2.def.id]);
  const afterVisibilityChange = await req('GET', `/user/public-profile/${aliceUsername}/competitive-profile`, bob.headers);
  const afterVisibilityFeatured = (afterVisibilityChange.body?.featuredAchievements ?? []).map((f: { achievementKey: string }) => f.achievementKey);
  check('A2 ya no aparece en featuredAchievements público tras pasar a PRIVATE (re-evaluado en lectura)', !afterVisibilityFeatured.includes(a2.def.achievementKey));
  check('A1 sigue apareciendo (sin cambio de visibilidad)', afterVisibilityFeatured.includes(a1.def.achievementKey));
  const stillSelectedRows = await pg.query(
    "SELECT COUNT(*) FROM public_profile_featured_achievement WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1) AND achievement_unlock_id = $2",
    [alice.accountId, unlockA2],
  );
  check('la fila de selección de A2 SIGUE existiendo en la tabla (no se borró, solo se re-filtra en lectura)', Number(stillSelectedRows.rows[0].count) === 1);
  await pg.query("UPDATE achievement_definition SET visibility_class = 'PUBLIC' WHERE id = $1", [a2.def.id]); // revertido, no afecta al resto del gate

  console.log('--- 11. Concurrencia real: dos PATCH simultáneos con conjuntos DISTINTOS de 3 -> nunca más de 3 filas finales ---');
  const [concurrentA, concurrentB] = await Promise.all([
    req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA1, unlockA2, unlockA3] }),
    req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [unlockA4, unlockA5, unlockA6] }),
  ]);
  check('ninguna de las dos solicitudes concurrentes devuelve 500', concurrentA.status !== 500 && concurrentB.status !== 500);
  check('ambas responden 200 (serializadas por el advisory lock, ninguna rechazada)', concurrentA.status === 200 && concurrentB.status === 200);
  const concurrentRows = await pg.query(
    "SELECT achievement_unlock_id FROM public_profile_featured_achievement WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1) ORDER BY display_order",
    [alice.accountId],
  );
  check('EXACTAMENTE 3 filas finales (nunca 6 -- sin la carrera que el advisory lock evita)', concurrentRows.rows.length === 3);
  const finalSet = concurrentRows.rows.map((r) => r.achievement_unlock_id).sort();
  const setA = [unlockA1, unlockA2, unlockA3].sort();
  const setB = [unlockA4, unlockA5, unlockA6].sort();
  check(
    'el resultado final es EXACTAMENTE uno de los dos conjuntos enviados, nunca una mezcla',
    JSON.stringify(finalSet) === JSON.stringify(setA) || JSON.stringify(finalSet) === JSON.stringify(setB),
  );

  console.log('--- 12. Trigger de capacidad como respaldo de base de datos (inserción DIRECTA, sin pasar por la aplicación) ---');
  const currentProfileRow = await pg.query('SELECT id FROM public_profile WHERE account_id = $1', [alice.accountId]);
  const aliceProfileId = currentProfileRow.rows[0].id as string;
  // En este punto ya hay 3 filas (concurrentRows). Insertar una 4ª directamente por SQL debe ser rechazada por el trigger.
  const extraUnlockDef = await makePublicAchievement('extra-capacity');
  const extraUnlock = await unlock(alice.accountId, extraUnlockDef.def, extraUnlockDef.version);
  let capacityTriggerFired = false;
  try {
    await pg.query(
      `INSERT INTO public_profile_featured_achievement (public_profile_id, achievement_unlock_id, display_order, created_at)
       VALUES ($1, $2, 3, now())`,
      [aliceProfileId, extraUnlock],
    );
  } catch (error) {
    capacityTriggerFired = (error as Error).message.includes('máximo de 3');
  }
  check('trigger enforce_featured_achievement_capacity rechaza una inserción DIRECTA por encima del cupo', capacityTriggerFired);

  console.log('--- 13. Trigger de consistencia como respaldo de base de datos (inserción DIRECTA con datos inválidos) ---');
  await pg.query('DELETE FROM public_profile_featured_achievement WHERE public_profile_id = $1', [aliceProfileId]);
  let consistencyTriggerFiredForOwnership = false;
  try {
    await pg.query(
      `INSERT INTO public_profile_featured_achievement (public_profile_id, achievement_unlock_id, display_order, created_at)
       VALUES ($1, $2, 0, now())`,
      [aliceProfileId, unlockBob],
    );
  } catch (error) {
    consistencyTriggerFiredForOwnership = (error as Error).message.includes('no pertenece a la cuenta');
  }
  check('trigger enforce_featured_achievement_consistency rechaza achievement_unlock de OTRA cuenta (inserción directa)', consistencyTriggerFiredForOwnership);

  let consistencyTriggerFiredForVisibility = false;
  try {
    await pg.query(
      `INSERT INTO public_profile_featured_achievement (public_profile_id, achievement_unlock_id, display_order, created_at)
       VALUES ($1, $2, 0, now())`,
      [aliceProfileId, unlockAPrivate],
    );
  } catch (error) {
    consistencyTriggerFiredForVisibility = (error as Error).message.includes('no es PUBLIC');
  }
  check('trigger enforce_featured_achievement_consistency rechaza un logro PRIVATE (inserción directa)', consistencyTriggerFiredForVisibility);

  console.log('--- 14. Sin identidad requerida: 401 en ambos endpoints ---');
  const getNoSession = await req('GET', '/user/public-profile/featured-achievements');
  check('GET sin sesión -> 401', getNoSession.status === 401);
  const putNoSession = await req('PATCH', '/user/public-profile/featured-achievements', {}, { achievementUnlockIds: [] });
  check('PATCH sin sesión -> 401', putNoSession.status === 401);

  console.log('--- 15. Perfil inexistente: GET vacío, PATCH -> 404 ---');
  const noProfile = await createSession('noprofile');
  const getNoProfile = await req('GET', '/user/public-profile/featured-achievements', noProfile.headers);
  check('GET sin public_profile -> 200, featured == [] (nunca error)', getNoProfile.status === 200 && getNoProfile.body?.featured.length === 0);
  const putNoProfile = await req('PATCH', '/user/public-profile/featured-achievements', noProfile.headers, { achievementUnlockIds: [] });
  check('PATCH sin public_profile -> 404', putNoProfile.status === 404);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Insignias Destacadas (LEF Bloque V, Incremento 2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
