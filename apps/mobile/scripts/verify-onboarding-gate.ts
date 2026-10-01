// VC4 MICROBLOQUE 7 -- gate DETERMINISTA (Node puro, sin backend/renderer)
// del pulido visual de Onboarding. No pertenece a `verify-b8-polish-gate.ts`
// (onboarding no es del dominio "pulido de Candidato B8" -- Challenges/
// RewardBurst/Ensayo/Review Mode -- sino de la primera impresión de marca),
// así que vive en su propio gate pequeño.
//
// Cubre exactamente los 9 checks mínimos pedidos por el prompt de 7,
// evitando regex frágiles: prioriza extracción estructural (imports,
// nombre de función exportada, props JSX) sobre coincidencias de texto
// largas.
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

function main() {
  const onboardingSrc = read('app', 'onboarding.tsx');
  const onboardingCode = onboardingSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const providerSrc = read('lib', 'onboarding', 'onboarding-provider.tsx');
  const layoutSrc = read('app', '_layout.tsx');

  console.log('--- VC4 MICROBLOQUE 7 -- Onboarding visual polish ---');

  // 1. CTA "Comenzar" sigue presente.
  check('CTA "Comenzar" presente', /label="Comenzar"/.test(onboardingCode));

  // 2. flujo funcional/persistencia no cambia -- misma función de
  // completion (`onboarding.complete()`), mismo provider, mismo guard en
  // `_layout.tsx` (no tocado por este bloque).
  check('el CTA sigue llamando onboarding.complete() (mismo mecanismo de persistencia, ADR-0009)', /onPress=\{\(\) => onboarding\.complete\(\)\}/.test(onboardingCode));
  check('sigue usando useOnboarding() del provider existente (sin nueva fuente de estado)', onboardingCode.includes("useOnboarding } from '../lib/onboarding/onboarding-provider'") || onboardingCode.includes('useOnboarding()'));
  // VC4 MICROBLOQUE 10 -- onboarding-provider.tsx fue legítimamente tocado
  // (fuera del alcance de Microbloque 7) para scoping por cuenta; el
  // mecanismo de persistencia sigue siendo el mismo `localFlags`, ahora con
  // `accountId` obligatorio (ver verify-account-state-isolation-gate.ts).
  check('onboarding-provider.tsx sigue persistiendo vía local-flags (mismo mecanismo, ahora scoped por accountId -- VC4 MICROBLOQUE 10)', providerSrc.includes('localFlags.setHasCompletedOnboarding(accountId, true)'));
  check('_layout.tsx conserva exactamente el mismo guard de navegación (Stack.Protected onboarding, sin rutas nuevas)', /Stack\.Protected guard=\{isAuthenticated && !isOnboardingComplete\}>\s*\n\s*<Stack\.Screen name="onboarding" \/>/.test(layoutSrc));

  // 3. una sola pantalla -- un único `export default function`, sin
  // router.push/replace/navigate a otra ruta de onboarding (ni pasos
  // adicionales, ni carrusel).
  check('una sola pantalla -- un único export default function en el archivo', (onboardingCode.match(/export default function/g) ?? []).length === 1);
  check('sin navegación a otra ruta (no hay router.push/replace/navigate en el archivo -- ni carrusel ni pasos)', !/router\.(push|replace|navigate)/.test(onboardingCode));

  // 4. copy de PAES presente (propuesta de valor aprobada).
  check('copy de propuesta de valor (PAES) presente', onboardingCode.includes('Prepárate para la PAES practicando, estudiando y midiendo tu progreso en un solo lugar.'));

  // 5. 3 beneficios presentes -- los 3 títulos aprobados, y exactamente 3
  // entradas en el array de datos (no 2, no un carrusel de N).
  const benefitTitles = ['Estudia a tu ritmo', 'Pon a prueba lo que sabes', 'Sigue mejorando'];
  check('los 3 títulos de beneficio aprobados están presentes', benefitTitles.every((title) => onboardingCode.includes(title)));
  const benefitsArrayMatch = onboardingCode.match(/const BENEFITS: Benefit\[\] = \[([\s\S]*?)\];/);
  check('BENEFITS tiene exactamente 3 entradas (ni menos ni más)', !!benefitsArrayMatch && (benefitsArrayMatch[1].match(/\{ icon:/g) ?? []).length === 3);

  // 6. no Premium upsell -- ninguna referencia a Premium/paywall/entitlement
  // en todo el archivo.
  check('sin Premium upsell -- ninguna referencia a Premium/paywall/entitlement', !/premium|paywall|entitlement/i.test(onboardingCode));

  // 7. no nuevas dependencias -- todos los imports resuelven a módulos ya
  // existentes en el repo (componentes/theme/lib ya usados en otras
  // pantallas), ninguna librería externa nueva más allá de RN/expo-router
  // ya usadas en el resto de la app.
  const importSpecifiers = [...onboardingCode.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  const allowedExternal = new Set(['react-native', 'react-native-safe-area-context']);
  const externalNew = importSpecifiers.filter((spec) => !spec.startsWith('.') && !allowedExternal.has(spec));
  check('sin dependencias externas nuevas (sólo react-native/react-native-safe-area-context, ya usadas en el resto de la app)', externalNew.length === 0);
  check('los componentes de marca reutilizados son los YA APROBADOS de Auth (ZetryndMark/AuthMeshDecoration, ningún componente de marca nuevo)', onboardingCode.includes("from '../components/auth/zetrynd-mark'") && onboardingCode.includes("from '../components/auth/auth-mesh-decoration'"));

  // 8. logo mantiene resize/aspect ratio correcto -- se usa `<ZetryndMark
  // size={...} />` (que fija width=height=size internamente, ver su propio
  // componente) y NUNCA se le pasa `style`/`width`/`height` que pudiera
  // deformarlo desde este archivo.
  check('ZetryndMark se usa sólo con `size` (aspect ratio 1:1 resuelto por el propio componente, sin `style`/`width`/`height` que lo deformen desde aquí)', /<ZetryndMark size=\{\d+\} \/>/.test(onboardingCode) && !/<ZetryndMark[^>]*style=/.test(onboardingCode));

  // 9. no app.json/native changes -- este archivo no referencia app.json,
  // expo-constants ni ningún archivo nativo/Android.
  check('onboarding.tsx no referencia app.json/expo-constants ni ningún path nativo/Android', !/app\.json|expo-constants|android\//i.test(onboardingCode));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Onboarding (VC4 MICROBLOQUE 7) pasaron.');
}

main();
