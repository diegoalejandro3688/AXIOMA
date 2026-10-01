// VC4 MICROBLOQUE 10/10.1 -- gate de aislamiento de estado local entre
// cuentas. Vive separado de `verify-b8-polish-gate.ts`/
// `verify-onboarding-gate.ts` (dominio distinto: esto es sobre IDENTIDAD DE
// CUENTA, no presentación). Estructural (lectura de fuente + regex), no
// ejecuta los módulos reales -- `local-flags.ts`/`auth-provider.tsx`
// importan `AsyncStorage`/React Native, que no puede ejecutarse bajo `tsx`
// puro (mismo motivo que obligó a mover `parsePipeRow`/`groupIntoSegments`
// a un módulo sin RN en Microbloque 9). La parte de SQLite real de
// `pending_reward` (migración v3, account scoping, legacy quarantine) SÍ se
// prueba con `node:sqlite` real en `verify-pending-reward-gate.ts` -- este
// gate no la duplica, sólo confirma estructuralmente que el store/repo
// están cableados para usarla.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE_ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(MOBILE_ROOT, ...p), 'utf8');
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function main() {
  const localFlags = strip(read('lib', 'storage', 'local-flags.ts'));
  const onboardingProvider = strip(read('lib', 'onboarding', 'onboarding-provider.tsx'));
  const xpStore = strip(read('lib', 'progress', 'instant-xp-store.ts'));
  const authProvider = strip(read('lib', 'auth', 'auth-provider.tsx'));
  const pendingLpStore = strip(read('lib', 'league', 'pending-lp-store.ts'));
  const pendingRewardRepoRaw = read('lib', 'offline', 'pending-reward-repository.ts');
  const pendingRewardRepo = strip(pendingRewardRepoRaw);
  const migrations = strip(read('lib', 'offline', 'migrations.ts'));

  console.log('--- ONBOARDING ---');

  // 1. completion key is account-scoped.
  check('la clave de completion está scoped por accountId (template literal con ${accountId})', /axioma\.v2\.hasCompletedOnboarding\.\$\{accountId\}/.test(localFlags));
  check('getHasCompletedOnboarding/setHasCompletedOnboarding exigen accountId como parámetro obligatorio', /getHasCompletedOnboarding\(accountId: string\)/.test(localFlags) && /setHasCompletedOnboarding\(accountId: string, value: boolean\)/.test(localFlags));

  // 2/3. legacy global cannot migrate to multiple accounts.
  check('existe un marcador de migración consumida ("onboardingLegacyMigrated") independiente de la clave scoped', /onboardingLegacyMigrated/.test(localFlags));
  check('el marcador se escribe INCONDICIONALMENTE (con o sin legacy=true) antes de decidir el resultado -- ventana de UNA sola lectura para siempre', /await writeBoolean\(KEYS\.onboardingLegacyMigrated, true\);\s*\n\s*\n\s*if \(legacyValue === true\)/.test(localFlags));
  check('si la migración YA fue consumida, se retorna false sin volver a leer el legacy (ninguna segunda cuenta puede heredar)', /if \(alreadyMigrated !== null\)[\s\S]{0,120}return false;/.test(localFlags));
  check('una cuenta SIN clave scoped propia consulta la migración legacy antes de devolver false (nunca asume incompleto sin chequear la migración one-time)', /const scoped = await readRawBoolean\(scopedOnboardingKey\(accountId\)\);\s*\n\s*if \(scoped !== null\) return scoped;\s*\n\s*\n\s*const alreadyMigrated/.test(localFlags));

  console.log('--- ONBOARDING -- RENDER-RACE HARDENING (VC4 MICROBLOQUE 10.1) ---');

  // 1/2/4 (§17 LP numbering reused para Onboarding -- ver enunciado 10.1 §17):
  // el status se deriva en el CUERPO del componente (no dentro del efecto),
  // comparando `resolvedForAccountId` contra el `accountId` del render
  // actual -- imposible exponer el status de A mientras accountId ya es B,
  // en NINGÚN render, independientemente del timing del efecto.
  check('OnboardingProvider importa useAuth y consume accountId', /import \{ useAuth \} from '\.\.\/auth\/auth-provider';/.test(onboardingProvider) && /const \{ accountId \} = useAuth\(\);/.test(onboardingProvider));
  check('existe un estado ResolvedState con resolvedForAccountId (nunca sólo el status "pelado")', /interface ResolvedState \{[\s\S]{0,150}resolvedForAccountId: string \| null;/.test(onboardingProvider));
  check('effectiveStatus se calcula en el CUERPO del render (no dentro de useEffect) comparando resolvedForAccountId contra accountId', /const effectiveStatus: OnboardingStatus = !accountId\s*\n\s*\? 'complete'.*\s*\n\s*: resolved\.resolvedForAccountId === accountId/.test(onboardingProvider));
  check('si resolvedForAccountId !== accountId (cuenta autenticada aún no resuelta), effectiveStatus es SIEMPRE "loading" (ninguna otra rama puede devolver el status de otra cuenta)', /: resolved\.resolvedForAccountId === accountId\s*\n\s*\? resolved\.resolvedStatus\s*\n\s*: 'loading';/.test(onboardingProvider));

  console.log('--- ONBOARDING -- QA REGRESSION FIX (accountId=null NUNCA bloquea Login) ---');

  // Regresión: accountId===null (logout/no-sesión) NO debe devolver 'loading' -- eso
  // combinado con el guard OR plano de `_layout.tsx`
  // (`auth.status==='loading' || onboarding.status==='loading'`) dejaba el spinner
  // global PERMANENTE tras logout, porque ningún useEffect corre para accountId=null
  // que pudiera resolverlo a otra cosa. "no authenticated account" (no bloqueante)
  // se distingue explícitamente de "authenticated account not yet resolved" (loading).
  check('sin accountId (no autenticado), effectiveStatus es "complete" (NO "loading") -- nunca bloquea el guard global de _layout.tsx tras logout', /!accountId\s*\n\s*\? 'complete'/.test(onboardingProvider));
  check('el caso !accountId está separado textualmente del caso "cuenta autenticada aún no resuelta" (dos ramas distintas, no un solo "loading" compartido)', !/!accountId\s*\n\s*\?\s*'loading'/.test(onboardingProvider));
  check('_layout.tsx sigue decidiendo la ruta real via isAuthenticated (independiente de isOnboardingComplete) -- el valor "complete" sin sesión nunca expone (tabs)', /guard=\{!isAuthenticated\}/.test(strip(read('app', '_layout.tsx'))) && /guard=\{isAuthenticated && isOnboardingComplete\}/.test(strip(read('app', '_layout.tsx'))));
  check('el guard global de _layout.tsx sigue siendo auth.status===loading || onboarding.status===loading (no se removió ni se parcheó con timeout/delay/navigation hack)', /auth\.status === 'loading' \|\| onboarding\.status === 'loading'/.test(strip(read('app', '_layout.tsx'))));
  check('ningún timeout/delay/setTimeout se introdujo como workaround en onboarding-provider.tsx', !/setTimeout|setInterval/.test(onboardingProvider));
  check('el value del contexto expone effectiveStatus (nunca el status crudo de React state sin comparar contra accountId)', /status: effectiveStatus,/.test(onboardingProvider));
  check('el useEffect sigue dependiendo de [accountId] (se re-ejecuta en cada cambio de cuenta) para RESOLVER, no para decidir el status expuesto', /\}, \[accountId\]\);/.test(onboardingProvider));
  check('misma cuenta (A -> A): el useEffect no se re-dispara con un accountId idéntico (React compara por valor) -- sin flash/reset innecesario', !/setResolved\(\{ resolvedForAccountId: null/.test(onboardingProvider) /* nunca se resetea a null explícitamente en cada render -- sólo useState inicial */);

  console.log('--- XP ---');

  // 6/7/8. account change resets/binds optimistic state.
  check('existe bindInstantXpAccount exportado', /export function bindInstantXpAccount\(accountId: string \| null\): void/.test(xpStore));
  check('bindInstantXpAccount resetea optimisticDelta Y baselineLifetimeXp juntos (nunca uno sin el otro)', /boundAccountId = accountId;\s*\n\s*optimisticDelta = 0;\s*\n\s*baselineLifetimeXp = null;/.test(xpStore));
  check('AuthProvider importa y liga bindInstantXpAccount', /import \{ bindInstantXpAccount \} from '\.\.\/progress\/instant-xp-store';/.test(authProvider));
  check('existe un único punto updateAccountId que liga XP y LP ANTES de setAccountId, en el mismo tick (nunca una ventana de desincronización)', /function updateAccountId\(id: string \| null\): void \{\s*\n\s*bindInstantXpAccount\(id\);\s*\n\s*bindPendingLpAccount\(id\);\s*\n\s*setAccountId\(id\);/.test(authProvider));
  check('ningún setAccountId directo sobrevive fuera de updateAccountId (todos los call sites migraron a updateAccountId)', (authProvider.match(/\bsetAccountId\(/g) ?? []).length === 1);
  check('los 5 puntos de cambio de identidad real (401/restore-ok/restore-fail/establishSession/logout) usan updateAccountId', (authProvider.match(/\bupdateAccountId\(/g) ?? []).length === 6 /* 1 declaración + 5 usos */);

  // 9. same-account refresh does not incorrectly reset if avoidable.
  check('bindInstantXpAccount es un no-op determinista cuando accountId no cambia (comparación estricta antes de resetear)', /if \(accountId === boundAccountId\) return;/.test(xpStore));

  console.log('--- LP (VC4 MICROBLOQUE 10.1 -- FIX IMPLEMENTADO, ver también verify-pending-reward-gate.ts para la prueba SQLite real) ---');

  // 5. schema includes account_id.
  check('la migración v3 agrega account_id a pending_reward (ADD COLUMN, aditiva)', /version: 3,[\s\S]{0,400}ALTER TABLE pending_reward ADD COLUMN account_id TEXT;/.test(migrations));
  check('la migración v3 crea un índice (account_id, status, created_at)', /CREATE INDEX idx_pending_reward_account_status ON pending_reward \(account_id, status, created_at\);/.test(migrations));

  // 6. new pending row always has owner.
  check('PendingRewardRepository.create exige accountId como parámetro obligatorio (nunca inferido implícitamente)', /async create\(input: \{ accountId: string; attemptId: string; rewardType: string; rewardAmount: number \}\)/.test(pendingRewardRepo));
  check('el INSERT real de create() incluye account_id en la columna Y en los parámetros enlazados', /INSERT INTO pending_reward \(id, account_id, attempt_id,/.test(pendingRewardRepo) && /\[id, input\.accountId, input\.attemptId,/.test(pendingRewardRepo));

  // 7/8/12. list/sum pending requires accountId; A rows never returned for B; no global SELECT.
  check('listPending exige accountId como parámetro obligatorio (nunca un SELECT global)', /async listPending\(accountId: string\): Promise<PendingReward\[\]>/.test(pendingRewardRepo));
  check('el SELECT de listPending filtra por account_id = ? (estructuralmente imposible devolver filas de otra cuenta)', /SELECT \* FROM pending_reward WHERE account_id = \? AND status = \? ORDER BY created_at ASC/.test(pendingRewardRepo));
  check('ningún consumo interno de listPending en el store lo llama sin accountId (repo\\.listPending\\(accountId\\), nunca repo\\.listPending\\(\\))', !/repo\.listPending\(\)/.test(pendingLpStore) && /repo\.listPending\(accountId\)/.test(pendingLpStore));

  // 9/13. A -> B cache invalidated before B exposure (no flash of A's LP).
  check('bindPendingLpAccount existe y limpia el caché SÍNCRONAMENTE antes de rehidratar (cache=[], hydrated=false)', /export function bindPendingLpAccount\(accountId: string \| null\): void \{[\s\S]{0,200}cache = \[\];\s*\n\s*hydrated = false;/.test(pendingLpStore));
  check('bindPendingLpAccount notifica el caché vacío ANTES de disparar la rehidratación (getPendingLp() nunca devuelve el snapshot de la cuenta anterior)', /notify\(\);\s*\n\s*void ensureHydrated\(\);/.test(pendingLpStore));
  check('existe un contador de generación que descarta hidrataciones en vuelo de la cuenta anterior tras un cambio de identidad', /let generation = 0;/.test(pendingLpStore) && /if \(myGeneration !== generation\) return;/.test(pendingLpStore));

  // 10. B -> A restores A pending if still pending (garantizado por persistencia real en SQLite scoped por account_id -- nunca borrado en logout, ver 11).
  check('bindPendingLpAccount vuelve a hidratar desde SQLite (nunca desde un caché en memoria perdido) cada vez que se liga una cuenta -- A recupera su propio pendiente real al volver', /void ensureHydrated\(\);/.test(pendingLpStore));

  // 11. logout does not delete A rows.
  check('ningún DELETE existe en pending-reward-repository.ts (las filas nunca se borran, sólo cambian de status -- ver markConfirmed/markExpired)', !/DELETE FROM pending_reward/.test(pendingRewardRepo));
  check('bindPendingLpAccount/updateAccountId nunca llaman a ningún método de borrado de pending_reward', !/bindPendingLpAccount[\s\S]{0,400}(DELETE|drop|remove)/i.test(pendingLpStore));

  // 13. legacy null-owner handling matches documented policy (quarantine, never adopted, never deleted).
  check('el repositorio documenta la política de cuarentena de filas legacy (account_id NULL nunca hace match con un filtro no-nulo)', /`account_id = \?` con un valor no-nulo jamás hace match con una\s*\n\s*\* fila `account_id IS NULL`/.test(pendingRewardRepoRaw));
  check('ningún código adopta automáticamente filas legacy (account_id NULL) a la cuenta actual (sin UPDATE ... SET account_id en runtime)', !/UPDATE pending_reward SET account_id/.test(pendingRewardRepo) && !/UPDATE pending_reward SET account_id/.test(pendingLpStore));

  console.log('--- GENERAL ---');
  check('ninguna dependencia nueva (onboarding-provider sólo importa local-flags/auth-provider/react)', !/import .*from '(?!\.\.?\/|react)/.test(onboardingProvider.split('\n').filter(l => l.startsWith('import')).join('\n')));
  check('ningún cambio de backend (pending-reward-repository.ts/migrations.ts no importan nada fuera de lib/offline)', !/from '(?!\.\.?\/)/.test(pendingRewardRepo.split('\n').filter(l => l.startsWith('import')).join('\n')));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de aislamiento de cuenta (VC4 MICROBLOQUE 10/10.1) pasaron.');
}

main();
