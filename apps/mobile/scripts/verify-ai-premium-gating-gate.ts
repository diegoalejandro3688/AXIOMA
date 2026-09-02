// Gate de PREMIUM V1 -- Capa 2 (Mobile gating), C2.4: upsell de cuota del Tutor IA.
//
// Verificacion DETERMINISTA -- Node puro. Ningun archivo de produccion se modifica.
//
// Cubre:
//   A. `lib/entitlement/ai-limit-upsell.ts` -> predicado PURO
//      `shouldShowAiLimitUpsell(state, blocked)`: SOLO `ready` + `FREE` +
//      `blocked`. PREMIUM / loading / error nunca. `!blocked` nunca.
//   B. `components/ai/ai-limit-upsell.tsx` -> componente dedicado FUERA del
//      scan legacy: usa `usePaywall`, CTA exacto `Amplía tu Tutor IA`, abre
//      exactamente `open('ai_quota')` y SOLO desde un `onPress` (nunca al
//      renderizar), sin "sin límites", sin Billing/compra/override, sin
//      numeros de plan.
//   C. Wiring en las pantallas escaneadas (`ia/index.tsx`,
//      `ia/conversation/[conversationId].tsx`) -> montan `<AiLimitUpsell
//      blocked={...}>` con el estado de bloqueo derivado del servidor
//      (`availability.canSend` / `homeAvailability`), NO importan
//      `usePaywall`/`useEntitlement`/`open('ai_quota')`, y no introducen
//      ninguna subcadena prohibida por el gate legacy (Free/Premium/premium,
//      3/6/15/50 consultas/turnos).
//   D. `verify:ai-mobile-gate.ts` sin editar (byte-identico).
//   E. package.json registra el script.
import { execFileSync } from 'node:child_process';
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
const REPO_ROOT = join(MOBILE_ROOT, '..', '..');
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const PREDICATE = 'lib/entitlement/ai-limit-upsell.ts';
const COMPONENT = 'components/ai/ai-limit-upsell.tsx';
const HUB = 'app/(tabs)/ia/index.tsx';
const CONVO = 'app/(tabs)/ia/conversation/[conversationId].tsx';
const LEGACY_GATE = 'apps/mobile/scripts/verify-ai-mobile-gate.ts';

/** El mismo regex de "numeros/planes de negocio" del gate legacy (verify-ai-mobile-gate.ts). */
const BUSINESS_STRINGS = /\b(?:3|50|6|15)\s*(?:consultas|turnos)\b|Free|Premium|premium/;

async function main() {
  // --------------------------------------------------------------------
  console.log('--- A. predicado puro shouldShowAiLimitUpsell ---');
  const { shouldShowAiLimitUpsell } = await import('../lib/entitlement/ai-limit-upsell');
  const readyFree = { status: 'ready' as const, tier: 'FREE' as const };
  const readyPremium = { status: 'ready' as const, tier: 'PREMIUM' as const };
  const loading = { status: 'loading' as const };
  const errored = { status: 'error' as const };

  check('blocked + FREE(ready) -> true', shouldShowAiLimitUpsell(readyFree, true) === true);
  check('blocked + PREMIUM(ready) -> false', shouldShowAiLimitUpsell(readyPremium, true) === false);
  check('blocked + loading -> false (nunca infiere FREE)', shouldShowAiLimitUpsell(loading, true) === false);
  check('blocked + error -> false (nunca infiere FREE)', shouldShowAiLimitUpsell(errored, true) === false);
  check('NO blocked + FREE(ready) -> false', shouldShowAiLimitUpsell(readyFree, false) === false);
  check('NO blocked + PREMIUM -> false', shouldShowAiLimitUpsell(readyPremium, false) === false);

  const predCode = stripComments(read(PREDICATE));
  check('el predicado es RN-free (no importa react/react-native)', !/from 'react'|from 'react-native'/.test(predCode));
  check('el predicado NO hace requests ni conoce numeros de plan', !/fetch\(|apiRequest|\b(?:3|6|15|50)\b/.test(predCode));

  // --------------------------------------------------------------------
  console.log('--- B. componente AiLimitUpsell (fuera del scan legacy) ---');
  const compCode = stripComments(read(COMPONENT));
  check('exporta AiLimitUpsell', /export function AiLimitUpsell\(/.test(compCode));
  check('delega la decision al predicado puro (no re-implementa la regla)', /shouldShowAiLimitUpsell\(state, blocked\)/.test(compCode) && /if \(!shouldShowAiLimitUpsell\(state, blocked\)\) return null;/.test(compCode));
  check('recibe `blocked` por prop -- NO detecta cuota/turnos ni hace requests', /\{ blocked \}: \{ blocked: boolean \}/.test(compCode) && !/resolveSendAvailability|fetch\(|apiRequest|dailyQuota|turnCount|remaining/.test(compCode));
  check('lee el entitlement (useEntitlement) para el tier confirmado', /const \{ state \} = useEntitlement\(\);/.test(compCode));
  check('usa el paywall global de C2.1 (usePaywall), sin modal/route propio', /const \{ open \} = usePaywall\(\);/.test(compCode) && !/Modal|createModal|router\.(push|replace|navigate)|BottomSheet/.test(compCode));
  check('CTA con el label EXACTO aprobado "Amplía tu Tutor IA"', /label="Amplía tu Tutor IA"/.test(compCode));
  check('abre EXACTAMENTE origin ai_quota, una sola vez', (compCode.match(/open\('ai_quota'\)/g) ?? []).length === 1);
  check('open(\'ai_quota\') SOLO desde un onPress (nunca al renderizar / en el cuerpo)', /onPress=\{\(\) => open\('ai_quota'\)\}/.test(compCode) && !/^\s*open\('ai_quota'\)/m.test(compCode));
  check('NO contiene "sin límites"', !/sin l[ií]mites/i.test(compCode));
  check('sin Billing / compra / suscripcion / override', !/billing|purchase|comprar|checkout|suscrip|subscription|override|setTier|play billing/i.test(compCode));
  check('sin autoridad numerica de plan (3/6/15/50 consultas|turnos, limit:/remaining:/consumed:)', !/\b(?:3|6|15|50)\s*(?:consultas|turnos)\b/.test(compCode) && !/\b(?:limit|remaining|consumed)\s*:\s*\d/.test(compCode));
  check('copy modesto: no promete mejor modelo / mas rapido / mas inteligente / ilimitado', !/mejor modelo|m[aá]s r[aá]pid|m[aá]s inteligente|ilimitad|unlimited/i.test(compCode));
  check('usa tokens del tema (useThemedStyles/ThemeTokens), sin hex sueltos', /useThemedStyles/.test(compCode) && /ThemeTokens/.test(compCode) && !/#[0-9a-fA-F]{3,8}\b/.test(compCode));

  // --------------------------------------------------------------------
  console.log('--- C. wiring en las pantallas del Tutor (superficie escaneada) ---');
  for (const [label, path, blockedExpr] of [
    ['hub', HUB, /<AiLimitUpsell blocked=\{!!homeAvailability && !homeAvailability\.canSend\} \/>/],
    ['conversation', CONVO, /<AiLimitUpsell blocked=\{!availability\.canSend\} \/>/],
  ] as const) {
    const raw = read(path);
    const code = stripComments(raw);
    check(`${label}: importa AiLimitUpsell desde components/ai (ruta sin "premium")`, /import \{ AiLimitUpsell \} from '[^']*components\/ai\/ai-limit-upsell'/.test(code));
    check(`${label}: monta <AiLimitUpsell blocked={<estado servidor>} />`, blockedExpr.test(code));
    check(`${label}: NO importa usePaywall / useEntitlement / open('ai_quota')`, !/usePaywall|useEntitlement|open\('ai_quota'\)/.test(code));
    check(`${label}: el wiring NO introduce subcadenas de plan prohibidas por el gate legacy`, !BUSINESS_STRINGS.test(code));
    check(`${label}: sin apertura automatica del paywall (ningun open(...) en el archivo)`, !/\.open\(/.test(code));
  }
  check('hub: el upsell va DESPUES del mensaje de bloqueo existente (homeAvailability)', read(HUB).indexOf('homeAvailability.message') < read(HUB).indexOf('<AiLimitUpsell'));
  check('conversation: el upsell va DESPUES del blockedBox existente', read(CONVO).indexOf('styles.blockedBox') < read(CONVO).indexOf('<AiLimitUpsell'));
  check('conversation: el blocked pasado = negacion del estado de disponibilidad canonico (resolveSendAvailability)', read(CONVO).includes('const availability = resolveSendAvailability(') && read(CONVO).includes('blocked={!availability.canSend}'));

  // --------------------------------------------------------------------
  console.log('--- D. gate legacy verify:ai-mobile-gate.ts sin editar ---');
  const legacyDiff = execFileSync('git', ['diff', '--stat', 'HEAD', '--', LEGACY_GATE], { cwd: REPO_ROOT, encoding: 'utf8' });
  check('verify-ai-mobile-gate.ts sin cambios (byte-identico)', legacyDiff.trim() === '');

  // --------------------------------------------------------------------
  console.log('--- E. package.json ---');
  check('verify:ai-premium-gating-gate registrado', /"verify:ai-premium-gating-gate": "tsx scripts\/verify-ai-premium-gating-gate\.ts"/.test(read('package.json')));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de upsell del Tutor IA (PREMIUM V1, Capa 2, C2.4) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
