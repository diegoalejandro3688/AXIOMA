// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), RC1B.1: POSTURA CONGELADA
// PRODUCCION-SEGURA.
//
// Verificacion DETERMINISTA -- Node/tsx puro. NO abre Postgres, NO levanta
// servidor, NO toca la red ni Google. Ejercita las funciones PURAS de eleccion
// de adaptador, los adaptadores `disabled`, y escanea el wiring estatico del
// modulo. No modifica ningun archivo de produccion.
//
// Cubre el CONFIG VALIDATION MATRIX de RC1B.1:
//   1. NODE_ENV=production + provider unset          -> REJECT
//   2. NODE_ENV=production + provider=disabled        -> ACCEPT (disabled)
//   3. NODE_ENV=production + provider=google          -> 'google' (las credenciales
//                                                       ausentes fallan cerrado despues,
//                                                       en la verificacion; §7 abajo)
//   4. NODE_ENV=production + RTDN impl unset          -> REJECT
//   5. NODE_ENV=production + RTDN impl=disabled        -> ACCEPT (sin OIDC config)
//   6. NODE_ENV=production + RTDN impl=google          -> 'google' (OIDC ausente -> fail-closed)
//   7. adaptador de suscripcion disabled -> nunca verifica / concede PREMIUM
//   8. auth RTDN disabled -> nunca autentica un push
//   9. modo disabled -> el worker RTDN NO se agenda
//  10. el modo `google` legitimo sigue intacto (regresion).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSubscriptionProviderChoice } from '../src/subscription/subscription-provider-choice';
import { resolveRtdnAuthChoice, rtdnProcessingEnabled } from '../src/subscription/rtdn/rtdn-auth-choice';
import { DisabledSubscriptionProviderAdapter } from '../src/subscription/disabled-subscription-provider.adapter';
import { DisabledRtdnPushAuthenticator } from '../src/subscription/rtdn/disabled-rtdn-push-authenticator';
import { SubscriptionProviderError } from '../src/subscription/subscription-provider.port';
import { RtdnPushAuthError } from '../src/subscription/rtdn/rtdn-push-authenticator.port';

const SRC = join(__dirname, '..', 'src');
const readSrc = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

async function main() {
  console.log('=== Gate RC1B.1 -- postura CONGELADA produccion-segura (Google Play Billing) ===\n');

  // ------------------------------------------------------------------
  console.log('--- A. resolveSubscriptionProviderChoice: matriz ---');
  const subMatrix: Array<[string | undefined, string | undefined, 'google' | 'fake' | 'disabled' | 'reject']> = [
    [undefined, undefined, 'fake'],
    ['development', undefined, 'fake'],
    ['development', 'fake', 'fake'],
    ['development', 'disabled', 'disabled'],
    ['production', undefined, 'reject'], // (1)
    ['production', 'fake', 'reject'],
    ['production', 'otro-valor', 'reject'],
    ['production', 'disabled', 'disabled'], // (2)
    ['production', 'google', 'google'], // (3) -- credenciales se validan despues
    ['staging', 'google', 'google'],
  ];
  for (const [env, impl, expected] of subMatrix) {
    const c = resolveSubscriptionProviderChoice(env, impl);
    const got = 'reject' in c ? 'reject' : c.use;
    check(`subChoice(NODE_ENV=${env ?? 'unset'}, impl=${impl ?? 'unset'}) -> ${expected}`, got === expected);
  }
  check(
    'A: produccion + impl ausente NO produce "disabled" implicito',
    !('use' in resolveSubscriptionProviderChoice('production', undefined)),
  );

  // ------------------------------------------------------------------
  console.log('\n--- B. resolveRtdnAuthChoice: matriz ---');
  const rtdnMatrix: Array<[string | undefined, string | undefined, 'google' | 'fake' | 'disabled' | 'reject']> = [
    [undefined, undefined, 'fake'],
    ['development', 'disabled', 'disabled'],
    ['production', undefined, 'reject'], // (4)
    ['production', 'fake', 'reject'],
    ['production', 'otro', 'reject'],
    ['production', 'disabled', 'disabled'], // (5)
    ['production', 'google', 'google'], // (6) -- OIDC se valida despues
  ];
  for (const [env, impl, expected] of rtdnMatrix) {
    const c = resolveRtdnAuthChoice(env, impl);
    const got = 'reject' in c ? 'reject' : c.use;
    check(`rtdnChoice(NODE_ENV=${env ?? 'unset'}, impl=${impl ?? 'unset'}) -> ${expected}`, got === expected);
  }
  check(
    'B: produccion + impl ausente NO produce "disabled" implicito',
    !('use' in resolveRtdnAuthChoice('production', undefined)),
  );

  // ------------------------------------------------------------------
  console.log('\n--- C. rtdnProcessingEnabled ---');
  check('C: google -> worker agendado', rtdnProcessingEnabled({ use: 'google' }) === true);
  check('C: fake -> worker agendado', rtdnProcessingEnabled({ use: 'fake' }) === true);
  check('C: disabled -> worker NO agendado (9)', rtdnProcessingEnabled({ use: 'disabled' }) === false);
  check('C: reject -> worker NO agendado', rtdnProcessingEnabled({ reject: 'x' }) === false);

  // ------------------------------------------------------------------
  console.log('\n--- D. DisabledSubscriptionProviderAdapter: nunca verifica / concede PREMIUM (7) ---');
  const subAdapter = new DisabledSubscriptionProviderAdapter();
  let getErr: unknown;
  let getResolved = false;
  try {
    await subAdapter.getSubscription('cualquier-token');
    getResolved = true;
  } catch (e) {
    getErr = e;
  }
  check('D: getSubscription NUNCA resuelve (siempre lanza)', getResolved === false);
  check('D: getSubscription lanza SubscriptionProviderError', getErr instanceof SubscriptionProviderError);
  check(
    'D: categoria del error === "disabled"',
    getErr instanceof SubscriptionProviderError && getErr.category === 'disabled',
  );
  let ackResolved = false;
  let ackErr: unknown;
  try {
    await subAdapter.acknowledgeSubscription('cualquier-token');
    ackResolved = true;
  } catch (e) {
    ackErr = e;
  }
  check('D: acknowledgeSubscription NUNCA resuelve', ackResolved === false);
  check(
    'D: acknowledge lanza SubscriptionProviderError categoria "disabled"',
    ackErr instanceof SubscriptionProviderError && ackErr.category === 'disabled',
  );

  // ------------------------------------------------------------------
  console.log('\n--- E. DisabledRtdnPushAuthenticator: nunca autentica un push (8) ---');
  const rtdnAuth = new DisabledRtdnPushAuthenticator();
  for (const header of [undefined, 'Bearer lo-que-sea', 'garbage']) {
    let resolved = false;
    let err: unknown;
    try {
      await rtdnAuth.authenticate(header);
      resolved = true;
    } catch (e) {
      err = e;
    }
    check(`E: authenticate(${header ?? 'undefined'}) NUNCA resuelve`, resolved === false);
    check(`E: authenticate(${header ?? 'undefined'}) lanza RtdnPushAuthError`, err instanceof RtdnPushAuthError);
  }

  // ------------------------------------------------------------------
  console.log('\n--- F. wiring estatico de SubscriptionModule ---');
  const mod = stripComments(readSrc('subscription/subscription.module.ts'));
  check(
    'F: subscription factory: choice "disabled" -> DisabledSubscriptionProviderAdapter (no fake, no google)',
    /choice\.use === 'disabled'\)\s*return new DisabledSubscriptionProviderAdapter\(\)/.test(mod),
  );
  check(
    'F: subscription factory: sigue LANZANDO en "reject" (fail-closed intacto)',
    /'reject' in choice\) throw new Error\(choice\.reject\)/.test(mod),
  );
  check(
    'F: subscription factory: modo "google" sigue construyendo el adaptador real (10)',
    /choice\.use === 'google' \? new GooglePlaySubscriptionAdapter\(config\) : fake/.test(mod),
  );
  check(
    'F: RTDN factory: choice "disabled" -> DisabledRtdnPushAuthenticator',
    /choice\.use === 'disabled'\)\s*return new DisabledRtdnPushAuthenticator\(\)/.test(mod),
  );
  check(
    'F: RTDN factory: el branch "disabled" ocurre ANTES de readRtdnAuthConfig (sin exigir OIDC)',
    mod.indexOf('new DisabledRtdnPushAuthenticator()') < mod.indexOf('readRtdnAuthConfig('),
  );
  check(
    'F: RTDN factory: OIDC incompleto con google/prod sigue haciendo throw (6)',
    /throw new Error\(\s*[`'"]Config de auth RTDN incompleta/.test(mod),
  );
  check(
    'F: provee RTDN_PROCESSING_ENABLED via rtdnProcessingEnabled(resolveRtdnAuthChoice(...))',
    /provide: RTDN_PROCESSING_ENABLED/.test(mod) &&
      /rtdnProcessingEnabled\(\s*resolveRtdnAuthChoice\(/.test(mod),
  );

  const scheduler = stripComments(readSrc('subscription/rtdn/rtdn-processing.scheduler.ts'));
  check(
    'F: RtdnProcessingScheduler.handle() sale temprano si !enabled (9)',
    /if \(!this\.enabled\) return;/.test(scheduler),
  );

  const svc = stripComments(readSrc('subscription/subscription-reconciliation.service.ts'));
  check(
    'F: mapProviderError trata "disabled" como 503 (ServiceUnavailableException)',
    /case 'disabled':/.test(svc) &&
      /case 'disabled':[\s\S]{0,400}?ServiceUnavailableException\(/.test(svc),
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de postura CONGELADA (RC1B.1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
