// F1-A.2 -- gate del CLI operador `request-account-deletion.ts`. Mismo
// patrón que `verify-privacy-gate.ts`: servidor real + Postgres directo para
// fixtures, CLI compilado invocado como lo haría un operador real (mismo
// precedente que `recoverAccountViaCli` en ese gate).
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

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

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

/** Invoca el CLI real (compilado), igual que lo haría un operador. `--yes` evita el prompt interactivo. */
function requestDeletionViaCli(email: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', ['dist/cli/request-account-deletion.js', email, '--yes'], {
      encoding: 'utf-8',
      env: process.env,
    });
    return { ok: true, output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- A. Email exacto -> resuelve cuenta -> invoca el método canónico ---');
  const uidA = `deletioncli-a-${Date.now()}`;
  const emailA = `deletioncli-a-${Date.now()}@example.com`;
  const tokenA = token({ providerSubject: uidA, email: emailA, emailVerified: true });
  const rSessionA = await post('/auth/session', { idToken: tokenA });
  const accountA = rSessionA.body?.accountId;

  const resultA = requestDeletionViaCli(emailA);
  check('CLI reporta éxito', resultA.ok);
  check('salida imprime accountId resuelto', resultA.output.includes(accountA));

  const accountRowA = await pg.query('SELECT status FROM account WHERE id = $1', [accountA]);
  check('Account.status DELETION_PENDING (mismo efecto que el flujo in-app)', accountRowA.rows[0]?.status === 'DELETION_PENDING');

  const requestRowA = await pg.query(
    "SELECT status, scheduled_for FROM privacy_request WHERE account_id = $1 ORDER BY requested_at DESC LIMIT 1",
    [accountA],
  );
  check('PrivacyRequest creada, status PENDING', requestRowA.rows[0]?.status === 'PENDING');
  const daysUntilScheduledA = (new Date(requestRowA.rows[0]?.scheduled_for).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  check('scheduledFor ~30 días en el futuro (misma ventana canónica)', daysUntilScheduledA > 29 && daysUntilScheduledA < 31);

  console.log('--- B. Email sin cuenta asociada -> ninguna solicitud creada ---');
  const emailNoMatch = `deletioncli-nomatch-${Date.now()}@example.com`;
  const resultB = requestDeletionViaCli(emailNoMatch);
  check('CLI falla limpio', !resultB.ok);
  check('mensaje claro de no-match', resultB.output.toLowerCase().includes('no se encontró'));
  const countB = await pg.query('SELECT count(*) FROM privacy_request pr JOIN account a ON a.id = pr.account_id WHERE a.id = $1', [
    '00000000-0000-0000-0000-000000000000',
  ]);
  check('sin filas huérfanas creadas (control trivial)', Number(countB.rows[0]?.count) === 0);

  console.log('--- C. Email malformado -> ninguna solicitud creada ---');
  const resultC = requestDeletionViaCli('no-es-un-email');
  check('CLI falla limpio ante input malformado', !resultC.ok);
  check('mensaje claro de entrada inválida', resultC.output.toLowerCase().includes('inválida'));

  console.log('--- D. Confirmación del operador (sin --yes) se puede cancelar sin escribir ---');
  // Sin `--yes` el CLI espera stdin -- una entrada vacía/"n" cancela. Se
  // ejercita enviando "n\n" por stdin directamente (execFileSync soporta `input`).
  const uidD = `deletioncli-d-${Date.now()}`;
  const emailD = `deletioncli-d-${Date.now()}@example.com`;
  const tokenD = token({ providerSubject: uidD, email: emailD, emailVerified: true });
  const rSessionD = await post('/auth/session', { idToken: tokenD });
  const accountD = rSessionD.body?.accountId;
  let cancelOutput = '';
  let cancelOk = true;
  try {
    cancelOutput = execFileSync('node', ['dist/cli/request-account-deletion.js', emailD], {
      encoding: 'utf-8',
      env: process.env,
      input: 'n\n',
    });
  } catch (error) {
    cancelOk = false;
    const e = error as { stdout?: string; stderr?: string };
    cancelOutput = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  check('operador cancela -> CLI sale con código de fallo (sin cambios)', !cancelOk);
  check('mensaje de cancelación explícito', cancelOutput.toLowerCase().includes('cancelado'));
  const accountRowD = await pg.query('SELECT status FROM account WHERE id = $1', [accountD]);
  check('Account.status permanece ACTIVE tras cancelar', accountRowD.rows[0]?.status === 'ACTIVE');

  console.log('--- E. Rechazo del servicio canónico se propaga (cuenta ya CLOSED) ---');
  const uidE = `deletioncli-e-${Date.now()}`;
  const emailE = `deletioncli-e-${Date.now()}@example.com`;
  const tokenE = token({ providerSubject: uidE, email: emailE, emailVerified: true });
  const rSessionE = await post('/auth/session', { idToken: tokenE });
  const accountE = rSessionE.body?.accountId;
  await pg.query("UPDATE account SET status = 'CLOSED' WHERE id = $1", [accountE]);
  const resultE = requestDeletionViaCli(emailE);
  check('CLI falla limpio ante cuenta ya CLOSED', !resultE.ok);
  check('mensaje de rechazo del servicio canónico visible', resultE.output.toLowerCase().includes('rechazado'));

  console.log('--- F. Ningún log de éxito/fallo contiene el email de entrada ---');
  check('salida de A no contiene el email', !resultA.output.includes(emailA));
  check('salida de B no contiene el email', !resultB.output.includes(emailNoMatch));
  check('salida de E no contiene el email', !resultE.output.includes(emailE));

  await pg.end();

  console.log(`\n${failures === 0 ? 'GATE PASS' : `GATE FALLÓ (${failures} check(s))`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
