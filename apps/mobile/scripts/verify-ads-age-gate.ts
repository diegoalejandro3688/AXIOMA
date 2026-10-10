/**
 * ADS V1 -- PRE-PLAY. Gate de la pantalla de edad neutral (mixed-audience ads).
 *
 * `tsx` puro, sin DB ni RN. Prueba de forma DETERMINISTA, sobre las funciones puras que
 * usa el proveedor, que:
 *   - edad desconocida => sin config remota, SDK sin inicializar, cero placements;
 *   - menor de 18       => idem;
 *   - adulto FREE       => flujo de anuncios existente;
 *   - adulto PREMIUM    => cero anuncios (y PREMIUM nunca ve anuncios, tenga la edad que tenga);
 *   - logout / cambio de cuenta no reutilizan la edad ni la elegibilidad de anuncios obsoleta;
 * y, por analisis estatico, que la fecha exacta NUNCA sale del dispositivo (ni red, ni backend,
 * ni contratos, ni persistencia, ni registros) y que la pantalla es neutral.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import {
  ADS_CONFIG_ENTRY_IDLE,
  deriveAdsPhase,
  isPlacementEnabled,
  scopeConfigToAccount,
  shouldFetchAdsConfig,
  shouldInitializeSdk,
  type AdsConfigEntry,
  type AdsEntitlementInput,
  type AdsPlacement,
  type AdsSdkInput,
} from '../lib/ads/ads-state';
import {
  AGE_ENTRY_IDLE,
  ageEligibilityKey,
  evaluateBirthDate,
  gateEntitlementByAge,
  parseStoredAgeEligibility,
  scopeAgeToAccount,
  shouldPromptForAge,
  type AgeEligibilityInput,
  type AgeEntry,
} from '../lib/ads/age-eligibility';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE = join(__dirname, '..');
const REPO = join(MOBILE, '..', '..');
const read = (p: string) => readFileSync(p, 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PLACEMENTS: AdsPlacement[] = ['bannerHome', 'bannerStudy', 'bannerCompete', 'interstitialQuickExit'];
const FULL_ON: AdsConfigResponse = {
  adsEnabled: true,
  bannerHomeEnabled: true,
  bannerStudyEnabled: true,
  bannerCompeteEnabled: true,
  interstitialCompeteEnabled: true,
  interstitialCooldownMinutes: 20,
  interstitialMaxPerSession: 1,
};

/**
 * Reproduce EXACTAMENTE la composicion de `AdsProvider`: edad (por cuenta) -> entitlement filtrado
 * -> (pedir config / inicializar SDK / fase / placements).
 */
function snapshot(input: { rawEntitlement: AdsEntitlementInput; accountId: string | null; ageEntry: AgeEntry; configEntry: AdsConfigEntry; sdk: AdsSdkInput; mode?: 'test' | 'production' | 'off' }) {
  const mode = input.mode ?? 'production';
  const age = scopeAgeToAccount(input.ageEntry, input.accountId);
  const entitlement = gateEntitlementByAge(input.rawEntitlement, age);
  const config = scopeConfigToAccount(input.configEntry, input.accountId);
  const phase = deriveAdsPhase(entitlement, config, input.sdk, mode);
  return {
    age,
    phase,
    fetchConfig: shouldFetchAdsConfig(entitlement, input.accountId, mode),
    initSdk: shouldInitializeSdk(entitlement, config, input.sdk, mode),
    placements: PLACEMENTS.filter((p) => isPlacementEnabled(phase, config, p)),
  };
}
const ageEntry = (accountId: string | null, value: AgeEligibilityInput, status: AgeEntry['status'] = 'resolved'): AgeEntry => ({ accountId, status, value });
const cfgEntry = (accountId: string, config: AdsConfigResponse = FULL_ON): AdsConfigEntry => ({ accountId, state: { status: 'ready', config } });
const NO_ADS = (s: ReturnType<typeof snapshot>) => s.phase !== 'ready' && s.placements.length === 0 && !s.initSdk;

function main() {
  console.log('--- 1. Derivacion de la etiqueta de edad (fecha libre, neutral) ---');
  {
    const now = new Date(2026, 9, 10); // 10-oct-2026 (local)
    const ev = (day: string, month: string, year: string) => evaluateBirthDate({ day, month, year }, now);
    const label = (r: ReturnType<typeof ev>) => (r.kind === 'ok' ? r.eligibility : 'invalid');
    check('cumple 18 HOY -> adult18plus', label(ev('10', '10', '2008')) === 'adult18plus');
    check('cumple 18 MANANA -> under18', label(ev('11', '10', '2008')) === 'under18');
    check('cumplio 18 ayer -> adult18plus', label(ev('9', '10', '2008')) === 'adult18plus');
    check('17 anos -> under18; 16 -> under18; 12 -> under18', label(ev('1', '1', '2009')) === 'under18' && label(ev('10', '10', '2010')) === 'under18' && label(ev('1', '1', '2014')) === 'under18');
    check('adulto tipico -> adult18plus', label(ev('15', '6', '1990')) === 'adult18plus');
    check('29-feb bisiesto valido (2008) y no bisiesto invalido (2009)', label(ev('29', '2', '2008')) === 'adult18plus' && label(ev('29', '2', '2009')) === 'invalid');
    check('dia/mes imposibles -> invalid (31-feb, 0, 32, mes 13)', label(ev('31', '2', '2000')) === 'invalid' && label(ev('0', '5', '2000')) === 'invalid' && label(ev('32', '1', '2000')) === 'invalid' && label(ev('1', '13', '2000')) === 'invalid');
    check('fecha futura -> invalid (manana, y proximo ano)', label(ev('11', '10', '2026')) === 'invalid' && label(ev('1', '1', '2027')) === 'invalid');
    check('hoy mismo (0 anos) -> under18; edad implausible (>120) -> invalid', label(ev('10', '10', '2026')) === 'under18' && label(ev('1', '1', '1850')) === 'invalid' && label(ev('1', '1', '1900')) === 'invalid');
    check('entradas no numericas / vacias / ano de 2 digitos -> invalid', label(ev('', '', '')) === 'invalid' && label(ev('a', '1', '2000')) === 'invalid' && label(ev('1', '1', '99')) === 'invalid' && label(ev('1.5', '1', '2000')) === 'invalid');
    check('espacios alrededor se toleran, el resultado es el mismo', label(ev(' 15 ', ' 6 ', ' 1990 ')) === 'adult18plus');
    check('la salida SOLO contiene la etiqueta (sin fecha ni edad exacta)', JSON.stringify(ev('15', '6', '1990')) === '{"kind":"ok","eligibility":"adult18plus"}');
  }

  console.log('--- 2. Persistencia: parseo estricto y clave POR CUENTA ---');
  {
    check('solo under18/adult18plus son validos; todo lo demas -> unknown', parseStoredAgeEligibility('adult18plus') === 'adult18plus' && parseStoredAgeEligibility('under18') === 'under18' && ['', 'ADULT', '1990-01-01', '18', 'true', 'unknown', null, undefined].every((v) => parseStoredAgeEligibility(v as string | null | undefined) === 'unknown'));
    check('la clave es distinta por cuenta (nunca global por dispositivo)', ageEligibilityKey('acc-A') !== ageEligibilityKey('acc-B'));
    check('la clave solo contiene [A-Za-z0-9._-] (valida para SecureStore)', /^[A-Za-z0-9._-]+$/.test(ageEligibilityKey('5b2f/..:weird id')));
  }

  console.log('--- 3. Edad DESCONOCIDA (FREE): sin config, sin SDK, cero placements ---');
  {
    for (const [name, entry] of [
      ['idle (sin lectura)', AGE_ENTRY_IDLE],
      ['cargando', ageEntry('acc-A', 'unknown', 'loading')],
      ['resuelta sin respuesta', ageEntry('acc-A', 'unknown')],
    ] as const) {
      const s = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: entry, configEntry: ADS_CONFIG_ENTRY_IDLE, sdk: 'idle' });
      check(`unknown (${name}): NO pide config remota`, !s.fetchConfig);
      check(`unknown (${name}): NO inicializa el SDK, fase disabled, 0 placements`, NO_ADS(s) && s.phase === 'disabled');
    }
    // Defensa en profundidad: aun con config ON de la cuenta y el SDK ya listo en el proceso.
    const s = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: ageEntry('acc-A', 'unknown'), configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('unknown + config ON + SDK ya listo: NO ready, 0 placements, 0 init', NO_ADS(s));
    const loadingEnt = snapshot({ rawEntitlement: 'loading', accountId: 'acc-A', ageEntry: ageEntry('acc-A', 'unknown'), configEntry: ADS_CONFIG_ENTRY_IDLE, sdk: 'idle' });
    check('unknown + entitlement loading: sin anuncios (fail-closed)', NO_ADS(loadingEnt) && !loadingEnt.fetchConfig);
    const errEnt = snapshot({ rawEntitlement: 'error', accountId: 'acc-A', ageEntry: ageEntry('acc-A', 'adult18plus'), configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('adulto + entitlement error: sin anuncios', NO_ADS(errEnt));
    const noSession = snapshot({ rawEntitlement: 'FREE', accountId: null, ageEntry: ageEntry('acc-A', 'adult18plus'), configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('sin sesion (accountId null) aunque haya una entrada adulta en memoria: sin anuncios', NO_ADS(noSession) && !noSession.fetchConfig);
  }

  console.log('--- 4. MENOR DE 18 (FREE): sin config, sin SDK, cero placements ---');
  {
    const s = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-M', ageEntry: ageEntry('acc-M', 'under18'), configEntry: ADS_CONFIG_ENTRY_IDLE, sdk: 'idle' });
    check('under18: NO pide config remota', !s.fetchConfig);
    check('under18: NO inicializa el SDK, fase disabled, 0 placements', NO_ADS(s) && s.phase === 'disabled');
    const stale = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-M', ageEntry: ageEntry('acc-M', 'under18'), configEntry: cfgEntry('acc-M'), sdk: 'ready' });
    check('under18 + config ON + SDK ya listo en el proceso: NO ready, 0 placements', NO_ADS(stale));
    check('under18 NO ve los cuatro placements (banners + interstitial) bajo ninguna config', PLACEMENTS.every((p) => !isPlacementEnabled(stale.phase, { status: 'ready', config: FULL_ON }, p)));
  }

  console.log('--- 5. ADULTO FREE: flujo de anuncios existente; ADULTO/MENOR/DESCONOCIDO PREMIUM: cero anuncios ---');
  {
    const A = ageEntry('acc-A', 'adult18plus');
    const before = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: A, configEntry: ADS_CONFIG_ENTRY_IDLE, sdk: 'idle' });
    check('adulto FREE: pide la config remota (waiting_config), aun sin SDK', before.fetchConfig && before.phase === 'waiting_config' && !before.initSdk);
    const withConfig = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: A, configEntry: cfgEntry('acc-A'), sdk: 'idle' });
    check('adulto FREE + config ON: SE inicializa el SDK (initializing)', withConfig.initSdk && withConfig.phase === 'initializing' && withConfig.placements.length === 0);
    const ready = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: A, configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('adulto FREE + SDK listo: ready con los 4 placements segun config', ready.phase === 'ready' && ready.placements.length === 4);
    const off = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: A, configEntry: cfgEntry('acc-A', ADS_CONFIG_OFF), sdk: 'ready' });
    check('adulto FREE con kill switch remoto apagado: 0 placements (el kill switch sigue mandando)', off.phase === 'disabled' && off.placements.length === 0);
    const noMode = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: A, configEntry: cfgEntry('acc-A'), sdk: 'ready', mode: 'off' });
    check("adulto FREE en build sin modo explicito ('off'): sin anuncios ni config", NO_ADS(noMode) && !noMode.fetchConfig);
    for (const age of ['adult18plus', 'under18', 'unknown'] as const) {
      const p = snapshot({ rawEntitlement: 'PREMIUM', accountId: 'acc-P', ageEntry: ageEntry('acc-P', age), configEntry: cfgEntry('acc-P'), sdk: 'ready' });
      check(`PREMIUM + edad ${age} + config ON + SDK listo: disabled, 0 placements, 0 init, 0 config`, NO_ADS(p) && !p.fetchConfig && p.phase === 'disabled');
    }
  }

  console.log('--- 6. Propiedad exhaustiva: `ready` / placements / init / config => FREE + adult18plus ---');
  {
    const ents: AdsEntitlementInput[] = ['loading', 'error', 'FREE', 'PREMIUM', 'GOLD' as AdsEntitlementInput];
    const ages: AgeEligibilityInput[] = ['unknown', 'under18', 'adult18plus', 'weird' as AgeEligibilityInput];
    const statuses: AgeEntry['status'][] = ['idle', 'loading', 'resolved'];
    const sdks: AdsSdkInput[] = ['idle', 'initializing', 'ready', 'failed'];
    const modes = ['test', 'production', 'off'] as const;
    let combos = 0;
    let violations = 0;
    for (const raw of ents)
      for (const age of ages)
        for (const st of statuses)
          for (const sdk of sdks)
            for (const mode of modes)
              for (const accountId of ['acc-A', null])
                for (const entryAccount of ['acc-A', 'acc-B', null]) {
                  combos++;
                  const s = snapshot({ rawEntitlement: raw, accountId, ageEntry: ageEntry(entryAccount, age, st), configEntry: cfgEntry('acc-A'), sdk, mode });
                  const eligible = raw === 'FREE' && age === 'adult18plus' && st === 'resolved' && accountId === 'acc-A' && entryAccount === 'acc-A' && mode !== 'off';
                  if (!eligible && (s.phase === 'ready' || s.placements.length > 0 || s.initSdk || s.fetchConfig)) violations++;
                }
    check(`PROPIEDAD (${combos} combinaciones): sin FREE + adult18plus de ESTA cuenta resuelta => nada de config, SDK ni placements`, violations === 0);
    check('gateEntitlementByAge: solo FREE+adult18plus devuelve FREE; PREMIUM se conserva PREMIUM', gateEntitlementByAge('FREE', 'adult18plus') === 'FREE' && gateEntitlementByAge('FREE', 'under18') !== 'FREE' && gateEntitlementByAge('FREE', 'unknown') !== 'FREE' && gateEntitlementByAge('PREMIUM', 'adult18plus') === 'PREMIUM' && gateEntitlementByAge('PREMIUM', 'unknown') === 'PREMIUM');
  }

  console.log('--- 7. Logout / cambio de cuenta: nada obsoleto se reutiliza ---');
  {
    const entryA = ageEntry('acc-A', 'adult18plus');
    check('scopeAgeToAccount: la entrada de A vale para A; NO para B ni para sesion nula', scopeAgeToAccount(entryA, 'acc-A') === 'adult18plus' && scopeAgeToAccount(entryA, 'acc-B') === 'unknown' && scopeAgeToAccount(entryA, null) === 'unknown');
    check('scopeAgeToAccount: entrada inicial (idle) y entrada en carga -> unknown', scopeAgeToAccount(AGE_ENTRY_IDLE, 'acc-A') === 'unknown' && scopeAgeToAccount(ageEntry('acc-A', 'adult18plus', 'loading'), 'acc-A') === 'unknown');
    // A (adulto FREE, anuncios listos) -> cambio a B: la entrada de edad y la de config siguen siendo de A durante un render.
    const aReady = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: entryA, configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('1. A adulto FREE: anuncios listos', aReady.phase === 'ready' && aReady.placements.length === 4);
    const windowB = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-B', ageEntry: entryA, configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('2. VENTANA OBSOLETA (cuenta B, entitlement aun FREE, edad y config de A): sin anuncios, sin config, sin init', NO_ADS(windowB) && !windowB.fetchConfig);
    const bUnknown = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-B', ageEntry: ageEntry('acc-B', 'unknown'), configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('3. B sin edad respondida (SDK ya listo en el proceso): sin anuncios, y se le pregunta', NO_ADS(bUnknown) && shouldPromptForAge({ entitlement: 'FREE', accountId: 'acc-B', modeIsOff: false, age: 'unknown', ageResolved: true, skippedThisSession: false }));
    const bMinor = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-B', ageEntry: ageEntry('acc-B', 'under18'), configEntry: cfgEntry('acc-B'), sdk: 'ready' });
    check('4. B menor de 18 (config de B ON, SDK listo): sin anuncios', NO_ADS(bMinor));
    const loggedOut = snapshot({ rawEntitlement: 'FREE', accountId: null, ageEntry: entryA, configEntry: cfgEntry('acc-A'), sdk: 'ready' });
    check('5. logout con las entradas de A aun en memoria: sin anuncios', NO_ADS(loggedOut));
    const backToA = snapshot({ rawEntitlement: 'FREE', accountId: 'acc-A', ageEntry: AGE_ENTRY_IDLE, configEntry: ADS_CONFIG_ENTRY_IDLE, sdk: 'ready' });
    check('6. A vuelve a iniciar sesion: mientras relee su etiqueta local (idle) NO hay anuncios', NO_ADS(backToA) && !backToA.fetchConfig);
    check('7. la etiqueta de A y la de B viven en claves de almacenamiento distintas', ageEligibilityKey('acc-A') !== ageEligibilityKey('acc-B'));
  }

  console.log('--- 8. Cuando se muestra la pantalla de edad ---');
  {
    const base = { entitlement: 'FREE' as AdsEntitlementInput, accountId: 'acc-A', modeIsOff: false, age: 'unknown' as AgeEligibilityInput, ageResolved: true, skippedThisSession: false };
    check('FREE + cuenta + modo activo + lectura terminada sin respuesta -> SI', shouldPromptForAge(base));
    check('PREMIUM -> NO (no se pide un dato que no se necesita)', !shouldPromptForAge({ ...base, entitlement: 'PREMIUM' }));
    check('entitlement loading / error -> NO', !shouldPromptForAge({ ...base, entitlement: 'loading' }) && !shouldPromptForAge({ ...base, entitlement: 'error' }));
    check('sin cuenta -> NO; build sin modo de anuncios -> NO; lectura local aun en curso -> NO', !shouldPromptForAge({ ...base, accountId: null }) && !shouldPromptForAge({ ...base, modeIsOff: true }) && !shouldPromptForAge({ ...base, ageResolved: false }));
    check('edad ya respondida (adult o under18) -> NO se vuelve a preguntar (sin reintento de fecha)', !shouldPromptForAge({ ...base, age: 'adult18plus' }) && !shouldPromptForAge({ ...base, age: 'under18' }));
    check('omitida en esta sesion -> NO (sigue sin anuncios)', !shouldPromptForAge({ ...base, skippedThisSession: true }));
  }

  console.log('--- 9. Estatico: la fecha exacta NUNCA sale del dispositivo ---');
  {
    const eligSrc = stripComments(read(join(MOBILE, 'lib/ads/age-eligibility.ts')));
    const storeSrc = stripComments(read(join(MOBILE, 'lib/ads/age-store.ts')));
    const hostSrc = stripComments(read(join(MOBILE, 'components/ads/age-screen-host.tsx')));
    const provSrc = stripComments(read(join(MOBILE, 'lib/ads/ads-provider.tsx')));
    const layoutSrc = stripComments(read(join(MOBILE, 'app/_layout.tsx')));
    const noNet = (src: string) => !/\bfetch\s*\(|apiRequest|XMLHttpRequest|from ['"][^'"]*\/api\/|from ['"][^'"]*lib\/api|axios/.test(src);
    const noLog = (src: string) => !/console\.(log|info|warn|error|debug)|Sentry|analytics/i.test(src);
    check('age-eligibility.ts: sin red, sin API, sin registros, sin AsyncStorage/SecureStore', noNet(eligSrc) && noLog(eligSrc) && !/AsyncStorage|SecureStore/.test(eligSrc));
    check('age-store.ts: sin red, sin API, sin registros; SOLO SecureStore; escribe unicamente la etiqueta derivada', noNet(storeSrc) && noLog(storeSrc) && !/AsyncStorage/.test(storeSrc) && /setItemAsync\(ageEligibilityKey\(accountId\), eligibility\)/.test(storeSrc) && /eligibility: AgeEligibility\b/.test(storeSrc));
    check('age-store.ts: no recibe ni referencia campos de fecha (day/month/year/BirthDate)', !/\b(day|month|year|BirthDate|birth)\b/i.test(storeSrc));
    check('age-screen-host.tsx: sin red, sin API, sin registros, sin almacenamiento', noNet(hostSrc) && noLog(hostSrc) && !/AsyncStorage|SecureStore|localFlags/.test(hostSrc));
    check('ads-provider.tsx: submitBirthDate NO guarda ni registra `fields`; solo escribe la etiqueta derivada', (() => {
      const m = provSrc.match(/const submitBirthDate = useCallback\([\s\S]*?\[accountId\],\s*\);/);
      if (!m) return false;
      const body = m[0];
      return /writeAgeEligibility\(accountId, result\.eligibility\)/.test(body) && !/console\./.test(body) && !/\bfields\b[^;\n]*(write|set|store|fetch)/i.test(body.replace(/evaluateBirthDate\(fields, new Date\(\)\)/, ''));
    })());
    check('ads-provider.tsx: el registro de QA no incluye fecha (solo la etiqueta `age=`)', /age=\$\{age\}/.test(read(join(MOBILE, 'lib/ads/ads-provider.tsx'))) && !/console\.info\([^)]*(day|month|year|birth)/i.test(provSrc));

    const contractsAndBackend: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === 'node_modules' || name === 'generated' || name === 'dist') continue;
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(ts|prisma)$/.test(name)) contractsAndBackend.push(p);
      }
    };
    walk(join(REPO, 'packages/contracts/src'));
    walk(join(REPO, 'apps/backend/src'));
    contractsAndBackend.push(join(REPO, 'apps/backend/prisma/schema.prisma'));
    const offenders = contractsAndBackend.filter((p) => /birth(date|day)?\b|dateOfBirth|\bdob\b|fechaNacimiento|fecha_nacimiento/i.test(stripComments(read(p)).replace(/\/\/\/.*$/gm, '')));
    check(`contratos + backend + schema (${contractsAndBackend.length} archivos): NINGUN campo de fecha de nacimiento (no se recopila del lado del servidor)`, offenders.length === 0);
    const apiClients = readdirSync(join(MOBILE, 'lib/api')).filter((n: string) => n.endsWith('.ts'));
    check(`clientes de API moviles (${apiClients.length}): ninguno envia fecha de nacimiento`, apiClients.every((n: string) => !/birth|dateOfBirth|\bdob\b|ageEligibility/i.test(stripComments(read(join(MOBILE, 'lib/api', n))))));
    check('la etiqueta de edad no se envia a ninguna API (ningun cliente la referencia)', apiClients.every((n: string) => !/under18|adult18plus/.test(read(join(MOBILE, 'lib/api', n)))));

    console.log('--- 10. Estatico: el proveedor SIEMPRE filtra por edad antes de decidir anuncios ---');
    check('el proveedor importa y usa gateEntitlementByAge', /gateEntitlementByAge/.test(provSrc) && /const entitlementInput = gateEntitlementByAge\(rawEntitlementInput, age\)/.test(provSrc));
    const rawUses = [...provSrc.matchAll(/rawEntitlementInput/g)].length;
    check('rawEntitlementInput solo se usa para (a) construir el filtrado y (b) decidir mostrar la pantalla', rawUses === 3 && /gateEntitlementByAge\(rawEntitlementInput, age\)/.test(provSrc) && /entitlement: rawEntitlementInput/.test(provSrc));
    check('shouldFetchAdsConfig / shouldInitializeSdk / deriveAdsPhase del proveedor usan SIEMPRE el entitlement filtrado', (() => {
      const calls = [...provSrc.matchAll(/(shouldFetchAdsConfig|shouldInitializeSdk|deriveAdsPhase)\(\s*([A-Za-z]+)/g)].filter((m) => !/^import/.test(m[0]));
      return calls.length >= 4 && calls.every((m) => m[2] === 'entitlementInput');
    })());
    check('initializeAdsSdk solo se invoca desde el proveedor, dentro del efecto gobernado por needsInit', (() => {
      const files: string[] = [];
      const walk2 = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (name === 'node_modules' || name === 'android' || name === '.expo') continue;
          const st = statSync(p);
          if (st.isDirectory()) walk2(p);
          else if (/\.(ts|tsx)$/.test(name) && !/scripts[\\/]/.test(p)) files.push(p);
        }
      };
      walk2(join(MOBILE, 'lib'));
      walk2(join(MOBILE, 'app'));
      walk2(join(MOBILE, 'components'));
      const callers = files.filter((p) => /initializeAdsSdk\s*\(/.test(stripComments(read(p))) && !/export (async )?function initializeAdsSdk/.test(read(p)));
      return callers.length === 1 && callers[0]!.replace(/\\/g, '/').endsWith('lib/ads/ads-provider.tsx') && /if \(!needsInit\) return;/.test(provSrc);
    })());
    check('_layout monta AgeScreenHost DENTRO de AdsProvider', /<AdsProvider>[\s\S]*<AgeScreenHost \/>[\s\S]*<\/AdsProvider>/.test(layoutSrc));

    console.log('--- 11. Estatico: la pantalla es NEUTRAL ---');
    const visible = [...hostSrc.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)].map((m) => m[1]!).concat([...hostSrc.matchAll(/(?:label|placeholder)="([^"]+)"/g)].map((m) => m[1]!));
    const userText = visible.join(' | ');
    check('el texto visible no menciona umbrales ni edades concretas (18, 16, 13, "mayor", "menor", "años", "adult")', !/\b(18|16|13|17|21)\b|mayor|menor|a(ñ|n)os de|adult|requisito|debes|tienes que/i.test(userText));
    check('los tres campos parten VACIOS (sin fecha preseleccionada) y no hay valores por defecto', (hostSrc.match(/useState\(''\)/g) ?? []).length === 3 && !/defaultValue|initialValue/.test(hostSrc));
    check('un unico mensaje de error, el mismo para toda fecha invalida; nada distinto segun el resultado', (hostSrc.match(/Revisa la fecha ingresada\./g) ?? []).length === 1 && !/adult18plus|under18/.test(hostSrc));
    check('sin boton "no tengo X anos" ni selector de rango de edad', !/Switch|Picker|Checkbox|tengo/.test(hostSrc));
  }

  console.log(failures === 0 ? '\nTodas las verificaciones del gate de edad (pantalla neutral + anuncios) pasaron.' : `\n${failures} verificacion(es) del gate de edad FALLARON.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
