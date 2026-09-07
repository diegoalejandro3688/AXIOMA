// PS-0C.2 (Increments B) -- gate de reporte / bloqueo de identidades
// públicas + ruta de operador. HTTP contra el servidor de gates + Postgres
// directo + servicios de dominio instanciados a mano para la ruta de
// operador (mismo patrón que verify-public-profile-gate.ts, que la CLI usa
// para recuperación de cuenta).
//
// Cubre PS-0C.2 §47 (report + block) y §48 (operator moderation).
import 'dotenv/config';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION, leaderboardRowSchema } from '@axioma/contracts';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import { PublicProfileReportRepository } from '../src/user/public-profile-report.repository';
import { PublicIdentityModerationService } from '../src/user/public-identity-moderation.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  OK  ${label}`);
  else { console.error(`FALLO  ${label}`); failures += 1; }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method, headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function publicUser(tag: string, username: string) {
  const uid = `ps0c2-rb-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const s = await req('POST', '/auth/session', {}, { idToken });
  const headers = { authorization: `Bearer ${idToken}`, 'x-session-id': s.body.sessionId };
  const accountId = s.body.accountId as string;
  await req('POST', '/user/public-profile', headers, { username });
  await req('POST', '/me/public-participation-terms/accept', headers, { version: CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION });
  await req('PATCH', '/user/public-profile/visibility', headers, { visible: true });
  return { accountId, headers, username };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const moderationService = new PublicIdentityModerationService(
    new PublicProfileRepository(prisma),
    new PublicProfileReportRepository(prisma),
  );

  const sfx = Date.now() % 100000;
  console.log('=== PS-0C.2 -- gate de reporte / bloqueo / moderación de operador ===\n');

  const alice = await publicUser('alice', `ps0crbalice${sfx}`);
  const bob = await publicUser('bob', `ps0crbbob${sfx}`);
  const carol = await publicUser('carol', `ps0crbcarol${sfx}`);

  // ---------------------------------------------------------------- REPORT
  console.log('--- A. Reporte de identidad pública ---');
  const noAuth = await req('POST', `/user/safety/reports/${bob.username}`, {}, { reportType: 'IMPERSONATION' });
  check('auth requerida (401 sin sesión)', noAuth.status === 401);

  const selfReport = await req('POST', `/user/safety/reports/${alice.username}`, alice.headers, { reportType: 'OTHER_SAFETY' });
  check('self-report rechazado (CANNOT_REPORT_SELF)', selfReport.status === 400 && selfReport.body?.error?.code === 'CANNOT_REPORT_SELF');

  const badType = await req('POST', `/user/safety/reports/${bob.username}`, alice.headers, { reportType: 'SPAM' });
  check('categoría inválida -> 400 VALIDATION_ERROR', badType.status === 400 && badType.body?.error?.code === 'VALIDATION_ERROR');

  const freeText = await req('POST', `/user/safety/reports/${bob.username}`, alice.headers, { reportType: 'IMPERSONATION', description: 'texto libre' });
  check('body con texto libre -> 400 (.strict, sin description)', freeText.status === 400);

  const missingTarget = await req('POST', `/user/safety/reports/noexiste${sfx}`, alice.headers, { reportType: 'IMPERSONATION' });
  check('objetivo inexistente -> 404 PUBLIC_PROFILE_NOT_FOUND', missingTarget.status === 404 && missingTarget.body?.error?.code === 'PUBLIC_PROFILE_NOT_FOUND');

  const rep1 = await req('POST', `/user/safety/reports/${bob.username}`, alice.headers, { reportType: 'INAPPROPRIATE_USERNAME' });
  check('reporte válido -> 201, status OPEN, alreadyReported=false', rep1.status === 201 && rep1.body.status === 'OPEN' && rep1.body.alreadyReported === false);
  const persisted = await pg.query('SELECT status, report_type, target_public_profile_id FROM public_profile_report WHERE id=$1', [rep1.body.reportId]);
  check('persistencia correcta (OPEN, tipo, targetPublicProfileId capturado)', persisted.rows[0]?.status === 'OPEN' && persisted.rows[0]?.report_type === 'INAPPROPRIATE_USERNAME' && persisted.rows[0]?.target_public_profile_id !== null);

  const rep2 = await req('POST', `/user/safety/reports/${bob.username}`, alice.headers, { reportType: 'INAPPROPRIATE_USERNAME' });
  check('doble toque / reintento seguro -> mismo reportId, alreadyReported=true', rep2.status === 201 && rep2.body.reportId === rep1.body.reportId && rep2.body.alreadyReported === true);
  const count = await pg.query('SELECT count(*)::int n FROM public_profile_report WHERE reporter_account_id=$1 AND target_account_id=$2', [alice.accountId, bob.accountId]);
  check('una sola fila de reporte', count.rows[0].n === 1);

  // reportar no muta el objetivo
  const bobProfileBefore = await pg.query('SELECT username_normalized, visibility_status, lifecycle_status, moderation_status FROM public_profile WHERE account_id=$1', [bob.accountId]);
  check('reportar no mutó el perfil del objetivo', bobProfileBefore.rows[0].username_normalized === bob.username && bobProfileBefore.rows[0].visibility_status === 'VISIBLE' && bobProfileBefore.rows[0].moderation_status === 'CLEAR');

  // ---------------------------------------------------------------- BLOCK
  console.log('\n--- B. Bloqueo entre cuentas ---');
  const selfBlock = await req('POST', `/user/safety/blocks/${alice.username}`, alice.headers);
  check('self-block rechazado (CANNOT_BLOCK_SELF)', selfBlock.status === 400 && selfBlock.body?.error?.code === 'CANNOT_BLOCK_SELF');

  const blk1 = await req('POST', `/user/safety/blocks/${bob.username}`, alice.headers);
  check('bloquear -> 201, alreadyBlocked=false', blk1.status === 201 && blk1.body.alreadyBlocked === false && blk1.body.username === bob.username);
  const blkRows = await pg.query('SELECT count(*)::int n FROM account_block WHERE blocker_account_id=$1 AND blocked_account_id=$2', [alice.accountId, bob.accountId]);
  check('una sola fila de bloqueo', blkRows.rows[0].n === 1);

  const blk2 = await req('POST', `/user/safety/blocks/${bob.username}`, alice.headers);
  check('bloqueo repetido seguro -> alreadyBlocked=true, sigue 1 fila', blk2.body.alreadyBlocked === true && (await pg.query('SELECT count(*)::int n FROM account_block WHERE blocker_account_id=$1 AND blocked_account_id=$2', [alice.accountId, bob.accountId])).rows[0].n === 1);

  // bloquear no toca ningún dato del objetivo
  const bobAfterBlock = await pg.query('SELECT username_normalized, visibility_status, moderation_status FROM public_profile WHERE account_id=$1', [bob.accountId]);
  check('bloquear no mutó nada del objetivo (username/visibility/moderation)', bobAfterBlock.rows[0].username_normalized === bob.username && bobAfterBlock.rows[0].visibility_status === 'VISIBLE' && bobAfterBlock.rows[0].moderation_status === 'CLEAR');

  // perfil del bloqueado -> 404 uniforme para el bloqueador (navegación no disponible)
  const aliceViewsBob = await req('GET', `/user/public-profile/${bob.username}/competitive-profile`, alice.headers);
  check('perfil del bloqueado -> 404 uniforme para el bloqueador', aliceViewsBob.status === 404);

  // otros usuarios siguen viendo al objetivo con normalidad
  const carolViewsBob = await req('GET', `/user/public-profile/${bob.username}/competitive-profile`, carol.headers);
  check('un tercero no bloqueador sigue viendo al objetivo (200)', carolViewsBob.status === 200 && carolViewsBob.body.username === bob.username);

  // el objetivo sigue viendo al bloqueador salvo que lo haya bloqueado por su cuenta
  const bobViewsAlice = await req('GET', `/user/public-profile/${alice.username}/competitive-profile`, bob.headers);
  check('el objetivo sigue viendo al bloqueador (relación unidireccional)', bobViewsAlice.status === 200);

  // lista propia + desbloquear
  const blockList = await req('GET', '/user/safety/blocks', alice.headers);
  check('lista de bloqueados contiene a bob', blockList.status === 200 && blockList.body.blocked.some((b: { username: string }) => b.username === bob.username));

  const unblock1 = await req('DELETE', `/user/safety/blocks/${bob.username}`, alice.headers);
  check('desbloquear -> 200 unblocked=true', unblock1.status === 200 && unblock1.body.unblocked === true);
  const unblock2 = await req('DELETE', `/user/safety/blocks/${bob.username}`, alice.headers);
  check('desbloquear inexistente seguro -> 200 unblocked=false', unblock2.status === 200 && unblock2.body.unblocked === false);
  const aliceViewsBobAfter = await req('GET', `/user/public-profile/${bob.username}/competitive-profile`, alice.headers);
  check('desbloquear restaura la visibilidad normal de la identidad', aliceViewsBobAfter.status === 200 && aliceViewsBobAfter.body.username === bob.username);

  // redacción de ranking: forma del contrato (rank/LP/zone intactos, identidad fuera)
  const redacted = leaderboardRowSchema.parse({ presentable: false, isCurrentUser: false, rankPosition: 13, metricValue: 40, competitiveZone: 'RETENTION', redactionReason: 'BLOCKED' });
  check('contrato: fila redactada por bloqueo conserva rank/LP/zone y NO expone identidad',
    redacted.presentable === false && redacted.rankPosition === 13 && redacted.metricValue === 40 && (redacted as { redactionReason?: string }).redactionReason === 'BLOCKED' && !('username' in redacted));

  // ---------------------------------------------------------- OPERATOR
  console.log('\n--- C. Ruta de operador (moderación) ---');
  // carol reporta a bob también -> 2 reportes OPEN sobre bob
  await req('POST', `/user/safety/reports/${bob.username}`, carol.headers, { reportType: 'IMPERSONATION' });
  const open = await moderationService.listOpenReports();
  const bobOpen = open.filter((r) => r.targetAccountId === bob.accountId);
  check('OPEN discoverable: 2 reportes OPEN sobre bob, con username resuelto', bobOpen.length === 2 && bobOpen.every((r) => r.targetUsername === bob.username));

  // dismiss: sólo cambia el estado del reporte
  const aliceReportId = rep1.body.reportId;
  await moderationService.dismissReport(aliceReportId);
  const dismissed = await pg.query('SELECT status, resolution_code, reviewed_at FROM public_profile_report WHERE id=$1', [aliceReportId]);
  check('dismiss -> DISMISSED + resolutionCode + reviewedAt, nada más', dismissed.rows[0].status === 'DISMISSED' && dismissed.rows[0].resolution_code === 'DISMISSED_NO_ACTION' && dismissed.rows[0].reviewed_at !== null);
  const bobUnchangedAfterDismiss = await pg.query('SELECT username_normalized, moderation_status FROM public_profile WHERE account_id=$1', [bob.accountId]);
  check('dismiss no tocó la identidad del objetivo', bobUnchangedAfterDismiss.rows[0].username_normalized === bob.username && bobUnchangedAfterDismiss.rows[0].moderation_status === 'CLEAR');

  // action-reset sobre el reporte restante de carol
  const carolReportId = bobOpen.find((r) => r.reportId !== aliceReportId)!.reportId;
  // snapshot de datos NO competitivos para probar que no se tocan
  const xpBefore = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id=$1', [bob.accountId]);
  const result = await moderationService.actionReportForceReset(carolReportId);
  check('action-reset: username anterior capturado, reportsActioned >= 1', result.previousUsername === bob.username && result.reportsActioned >= 1);
  const bobReset = await pg.query('SELECT username_normalized, visibility_status, moderation_status FROM public_profile WHERE account_id=$1', [bob.accountId]);
  check('identidad pública retirada: moderation_status=USERNAME_RESET, visibility=PRIVATE, username centinela',
    bobReset.rows[0].moderation_status === 'USERNAME_RESET' && bobReset.rows[0].visibility_status === 'PRIVATE' && bobReset.rows[0].username_normalized.startsWith('reset-'));
  const histRow = await pg.query("SELECT change_reason FROM profile_username_history WHERE previous_username_normalized=$1 ORDER BY changed_at DESC LIMIT 1", [bob.username]);
  check('historial: fila MODERATION_RESET con el username infractor', histRow.rows[0]?.change_reason === 'MODERATION_RESET');
  const carolResolved = await pg.query('SELECT status, resolution_code FROM public_profile_report WHERE id=$1', [carolReportId]);
  check('reporte accionado -> ACTIONED + ACTIONED_USERNAME_RESET', carolResolved.rows[0].status === 'ACTIONED' && carolResolved.rows[0].resolution_code === 'ACTIONED_USERNAME_RESET');
  const xpAfter = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id=$1', [bob.accountId]);
  check('score/XP/progreso/cuenta sin cambios', (xpBefore.rows[0]?.lifetime_xp ?? null) === (xpAfter.rows[0]?.lifetime_xp ?? null));
  const bobAccount = await pg.query('SELECT status FROM account WHERE id=$1', [bob.accountId]);
  check('la cuenta sigue usable (status intacto)', bobAccount.rows[0].status !== 'CLOSED');

  // no se puede reclamar instantáneamente el username infractor (ventana de reserva)
  const reclaimAttempt = await req('POST', `/user/safety/reports/x`, carol.headers, { reportType: 'OTHER_SAFETY' }); // no-op call to keep carol alive
  void reclaimAttempt;
  const carolTriesInfringing = await (async () => {
    const c2 = await publicUser('c2', `dummy${sfx}zz`).catch(() => null);
    if (!c2) return null;
    return req('PATCH', '/user/public-profile/username', c2.headers, { username: bob.username });
  })();
  check('el username infractor queda reservado (409 al intentar reclamarlo)', carolTriesInfringing?.status === 409);

  // retry-safe: repetir action-reset sólo cierra reportes, no re-resetea
  const retry = await moderationService.actionReportForceReset(carolReportId);
  check('action-reset retry-safe (alreadyReset=true)', retry.alreadyReset === true);

  // recuperación: bob elige un username nuevo válido -> moderation vuelve a CLEAR, sin cooldown
  const recover = await req('PATCH', '/user/public-profile/username', bob.headers, { username: `ps0crbbob2${sfx}` });
  check('recuperación: nuevo username válido -> 200, sin cooldown', recover.status === 200 && recover.body.moderationStatus === 'CLEAR' && recover.body.username === `ps0crbbob2${sfx}`);

  await pg.end();
  if (failures > 0) { console.error(`\n${failures} verificación(es) fallida(s).`); process.exit(1); }
  console.log('\nTodas las verificaciones pasaron.');
}

main().catch((e) => { console.error(e); process.exit(1); });
