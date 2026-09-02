// Gate de PREMIUM V1 -- Capa 2 (Mobile gating), C2.1: primitivos Premium +
// host del paywall.
//
// Verificacion DETERMINISTA -- Node puro, scan de fuente. Ningun archivo de
// produccion se modifica.
//
// Cubre:
//   A. PaywallOrigin = EXACTAMENTE 'unit' | 'resources' | 'exams' | 'ai_quota'.
//   B. <PremiumPaywall> usa el primitivo Dialog -- SIN route, bottom sheet
//      ni modal custom.
//   C. Copy: encabezado por origin, lista de beneficios, SIN "sin limites".
//   D. Precio: SOLO de lib/entitlement/pricing.ts, sin literal hardcodeado.
//   E. CTA: "Disponible proximamente" es <Text> no interactivo (no Button/
//      DialogAction); "Ahora no" es la unica accion (secondaryAction ->
//      onRequestClose); sin primaryAction; sin compra/Billing/override.
//   F. <PremiumBadge>: componente propio, no toca Chip, lock + state.warning,
//      sin opacity.
//   G. <PremiumLockedScreen>: prop `onBack` explicita, SIN conocimiento de
//      rutas; "Ver Premium" abre el paywall con el origin recibido.
//   H. PaywallProvider: usePaywall -> { open, close }; renderiza el paywall
//      una vez; cierra/limpia origin en logout o cambio de accountId; no lee
//      el tier.
//   I. Host montado en _layout.tsx dentro de EntitlementProvider.
//   J. NINGUNA pantalla de producto llama open()/usa las primitivas todavia.
//   K. Sin assets/imagenes.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Recorre app/ recursivamente y devuelve el contenido concatenado de todos los .ts/.tsx. */
function readAllAppSources(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(`\n// ${full}\n${readFileSync(full, 'utf8')}`);
    }
  };
  walk(join(MOBILE_ROOT, 'app'));
  return out.join('\n');
}

function main() {
  const paywallSrc = read('components', 'premium', 'premium-paywall.tsx');
  const paywallCode = stripComments(paywallSrc);
  const badgeSrc = read('components', 'premium', 'premium-badge.tsx');
  const badgeCode = stripComments(badgeSrc);
  const lockedSrc = read('components', 'premium', 'premium-locked-screen.tsx');
  const lockedCode = stripComments(lockedSrc);
  const ctxSrc = read('lib', 'entitlement', 'paywall-context.tsx');
  const ctxCode = stripComments(ctxSrc);
  const typesCode = stripComments(read('lib', 'entitlement', 'types.ts'));
  const layoutSrc = read('app', '_layout.tsx');
  const premiumComponents = [paywallCode, badgeCode, lockedCode].join('\n');

  // --------------------------------------------------------------------
  console.log('--- A. PaywallOrigin ---');
  const originMatch = typesCode.match(/export type PaywallOrigin = ([^;]+);/);
  check('PaywallOrigin declarado en lib/entitlement/types.ts', !!originMatch);
  if (originMatch) {
    const members = originMatch[1].split('|').map((s) => s.trim().replace(/['"]/g, '')).sort();
    check(
      "PaywallOrigin = EXACTAMENTE { unit, resources, exams, ai_quota }",
      JSON.stringify(members) === JSON.stringify(['ai_quota', 'exams', 'resources', 'unit']),
    );
  }

  // --------------------------------------------------------------------
  console.log('--- B. <PremiumPaywall> sobre Dialog, sin route/bottom-sheet/modal custom ---');
  check('importa el primitivo Dialog', /import \{ Dialog \} from '\.\.\/ui\/dialog'/.test(paywallCode) || /from '\.\.\/ui'[\s\S]{0,120}Dialog/.test(paywallCode));
  check('renderiza <Dialog ...>', /<Dialog\b/.test(paywallCode));
  check('NO importa expo-router / Stack / router', !/expo-router|useRouter|\bStack\b|createStackNavigator/.test(paywallCode));
  check('NO usa el Modal de react-native directamente ni un BottomSheet', !/from 'react-native'[\s\S]{0,200}\bModal\b/.test(paywallCode) && !/BottomSheet|bottom-sheet|@gorhom/.test(paywallCode));

  // --------------------------------------------------------------------
  console.log('--- C. Copy ---');
  check("encabezado contextual para los 4 origins (HEADING: Record<PaywallOrigin, string>)", /HEADING: Record<PaywallOrigin, string> = \{[\s\S]*?unit:[\s\S]*?resources:[\s\S]*?exams:[\s\S]*?ai_quota:[\s\S]*?\}/.test(paywallCode));
  check('lista de beneficios presente', /BENEFITS[\s\S]{0,40}=\s*\[[\s\S]*?'Todas las unidades[\s\S]*?'Todos los recursos[\s\S]*?'Todos los Ensayos PAES[\s\S]*?'Más consultas con el Tutor IA[\s\S]*?\]/.test(paywallCode));
  // Scan del codigo (sin comentarios): el docstring documenta a proposito que NO se diga "sin limites".
  check('el paywall NO contiene "sin limites" / "sin límites" (codigo)', !/sin l[ií]mites/i.test(paywallCode));
  check('el titulo del Dialog es "ZETRYND Premium"', /title="ZETRYND Premium"/.test(paywallCode));

  // --------------------------------------------------------------------
  console.log('--- D. Precio ---');
  check('importa PREMIUM_PRICE_DISPLAY de lib/entitlement/pricing', /import \{ PREMIUM_PRICE_DISPLAY \} from '\.\.\/\.\.\/lib\/entitlement\/pricing'/.test(paywallCode));
  check('renderiza {PREMIUM_PRICE_DISPLAY}', /\{PREMIUM_PRICE_DISPLAY\}/.test(paywallCode));
  check('el paywall NO hardcodea el literal de precio (6.990 / CLP)', !/6[.,]990|CLP/.test(paywallCode));

  // --------------------------------------------------------------------
  console.log('--- E. CTA: no interactivo salvo "Ahora no" ---');
  check('"Disponible proximamente" se renderiza como <Text> (no Button, no DialogAction)', /<Text[^>]*>\s*Disponible próximamente\s*<\/Text>/.test(paywallCode) && !/label=(['"])Disponible próximamente\1/.test(paywallCode));
  check('"Ahora no" es secondaryAction y cierra el Dialog (onRequestClose)', /secondaryAction=\{\{ label: 'Ahora no', onPress: onRequestClose[\s\S]{0,40}\}\}/.test(paywallCode));
  check('NO hay primaryAction (ninguna accion de compra en Capa 2)', !/primaryAction=/.test(paywallCode));
  check('los primitivos Premium NO mencionan compra / Billing / suscripcion / override interno', !/purchase|comprar|Billing|billing|subscription|suscri(p|b)|set-tier-override|_internal\/entitlement|InAppPurchase|iap\b/i.test(premiumComponents + ctxCode));

  // --------------------------------------------------------------------
  console.log('--- F. <PremiumBadge> ---');
  check('componente propio -- NO importa ni referencia Chip', !/chip|Chip/.test(badgeCode));
  check('usa el icono lock', /name="lock"/.test(badgeCode));
  check('usa los tokens state.warning (bg + text)', /state\.warning\.background/.test(badgeCode) && /state\.warning\.text/.test(badgeCode));
  check('NO aplica opacity', !/opacity/i.test(badgeCode));
  check('texto del badge = "Premium"', />\s*Premium\s*<\/Text>/.test(badgeCode));

  // --------------------------------------------------------------------
  console.log('--- G. <PremiumLockedScreen> ---');
  check('prop `onBack` OBLIGATORIA y explicita (no opcional)', /onBack:\s*\(\)\s*=>\s*void;/.test(lockedCode) && !/onBack\?:/.test(lockedCode));
  check('NO conoce rutas: sin useRouter / router. / canGoBack / .replace( / .back() / navigate / expo-router', !/useRouter|\brouter\.|canGoBack|\.replace\(|\.back\(\)|navigate\(|expo-router/.test(lockedCode));
  check('"Volver" invoca onBack', /label="Volver" onPress=\{onBack\}/.test(lockedCode));
  check('"Ver Premium" abre el paywall con el origin recibido', /label="Ver Premium" onPress=\{\(\) => open\(origin\)\}/.test(lockedCode));
  check('usa usePaywall de lib/entitlement/paywall-context', /import \{ usePaywall \} from '\.\.\/\.\.\/lib\/entitlement\/paywall-context'/.test(lockedCode));
  check('NO aplica opacity a la pantalla', !/opacity/i.test(lockedCode));

  // --------------------------------------------------------------------
  console.log('--- H. PaywallProvider ---');
  check('usePaywall expone { open, close }', /interface PaywallContextValue \{\s*open: \(origin: PaywallOrigin\) => void;\s*close: \(\) => void;\s*\}/.test(ctxCode));
  check('renderiza <PremiumPaywall ...> una vez (patron host)', (ctxCode.match(/<PremiumPaywall\b/g) ?? []).length === 1);
  check('cierra/limpia origin en logout o cambio de cuenta', /useEffect\(\(\) => \{[\s\S]*?auth\.accountId !== accountIdRef\.current[\s\S]*?auth\.status !== 'authenticated' \|\| accountChanged[\s\S]*?setOrigin\(\(prev\) => \(prev === null \? prev : null\)\)[\s\S]*?\}, \[auth\.status, auth\.accountId\]\);/.test(ctxCode));
  check('NO lee el tier (no importa useEntitlement)', !/useEntitlement|entitlement-provider/.test(ctxCode));
  check('open/close son estables (useCallback)', /const open = useCallback\(\(next: PaywallOrigin\) => setOrigin\(next\), \[\]\)/.test(ctxCode) && /const close = useCallback\(\(\) => setOrigin\(null\), \[\]\)/.test(ctxCode));

  // --------------------------------------------------------------------
  console.log('--- I. Host montado en _layout.tsx ---');
  check('importa PaywallProvider de lib/entitlement/paywall-context', /import \{ PaywallProvider \} from '\.\.\/lib\/entitlement\/paywall-context'/.test(layoutSrc));
  check('PaywallProvider anidado dentro de EntitlementProvider, envolviendo ThemedRootNavigator', /<EntitlementProvider>\s*<PaywallProvider>\s*<ThemedRootNavigator \/>\s*<\/PaywallProvider>\s*<\/EntitlementProvider>/.test(layoutSrc));

  // --------------------------------------------------------------------
  console.log('--- J. Ninguna pantalla de producto usa las primitivas todavia ---');
  const appSources = readAllAppSources();
  check('ningun archivo de app/ importa/usa usePaywall', !/usePaywall/.test(appSources));
  check('ningun archivo de app/ usa <PremiumPaywall> / <PremiumBadge> / <PremiumLockedScreen>', !/<PremiumPaywall\b|<PremiumBadge\b|<PremiumLockedScreen\b/.test(appSources));
  check('ninguna pantalla llama open(<origin>)', !/\.open\((['"])(unit|resources|exams|ai_quota)\1\)/.test(appSources.replace(layoutSrc, ''))); // _layout monta el host, no llama open
  check('ninguna superficie IA gana subcadenas de plan (Premium/Free/3-6-15-50) por C2.1', (() => {
    const aiFiles = [
      read('app', '(tabs)', 'ia', 'index.tsx'),
      read('app', '(tabs)', 'ia', 'conversation', '[conversationId].tsx'),
    ].map(stripComments).join('\n');
    return !/\b(?:3|50|6|15)\s*(?:consultas|turnos)\b|Free|Premium|premium/.test(aiFiles);
  })());

  // --------------------------------------------------------------------
  console.log('--- K. Sin assets ---');
  const premiumDir = join(MOBILE_ROOT, 'components', 'premium');
  const premiumFiles = existsSync(premiumDir) ? readdirSync(premiumDir) : [];
  check('components/premium/ contiene solo .tsx (sin imagenes)', premiumFiles.every((f) => /\.tsx$/.test(f)));
  check('los primitivos Premium no importan imagenes (require / .png / .webp / <Image)', !/require\(['"][^'"]+\.(png|jpg|jpeg|webp|svg)['"]\)|\.(png|webp|jpg)['"]|<Image\b/.test(premiumComponents));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Premium Paywall (PREMIUM V1, Capa 2, C2.1) pasaron.');
}

main();
