// Gate del contrato compartido de PREMIUM V1 -- Capa 1 (Entitlement backend),
// C1.0. Deliberadamente SIN Postgres, SIN Docker, SIN `run-gate.ts` --
// ejecutable con solo `tsx`, mismo criterio que
// `verify-free-practice-api-gate.ts` / `verify-content-source-gate.ts`.
//
// Congela, antes de que cualquier runtime lo consuma:
//   A. PREDICADO DE POSICION -- `FREE_UNITS_PER_SUBJECT === 2` y la tabla de
//      verdad completa de `isFreeUnitPosition`, incluyendo el caso defensivo
//      `-1 -> false` (usado por el clasificador de contenido en C1.3) y
//      entradas no enteras / negativas / fuera de rango.
//   B. CODE DE ERROR -- `PREMIUM_REQUIRED_CODE === 'PREMIUM_REQUIRED'`.
//   C. SCHEMA DE ENTITLEMENT -- `accountEntitlementResponseSchema` es
//      `.strict()`, acepta exactamente `{ tier: 'FREE' | 'PREMIUM' }` y
//      rechaza tier desconocido, objeto vacio y CUALQUIER campo extra
//      (precio, estado de suscripcion, fechas).
//   D. ENUM DE TIER -- `premiumTierSchema` es exactamente ['FREE','PREMIUM'].
//   E. AUSENCIA DE PRICING/ORIGIN EN CAPA 1 -- el codigo ejecutable de
//      `premium.ts` no define ninguna constante/simbolo de precio, moneda,
//      texto de precio, producto de store ni `PremiumOrigin`.
//   F. RE-EXPORT -- los simbolos se alcanzan desde `@axioma/contracts`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FREE_UNITS_PER_SUBJECT,
  isFreeUnitPosition,
  premiumTierSchema,
  accountEntitlementResponseSchema,
  PREMIUM_REQUIRED_CODE,
} from '@axioma/contracts';

const ROOT = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

/** Elimina comentarios de bloque y de linea -- el scan de "ausencia" mira SOLO codigo ejecutable
 *  (el docstring menciona a proposito "$6.990 CLP/mes", "billing" y "origin" para documentar que NO viven en codigo). */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// --------------------------------------------------------------------------
console.log('--- A. Predicado de posicion de unidad ---');
check('FREE_UNITS_PER_SUBJECT === 2', FREE_UNITS_PER_SUBJECT === 2);

const truthTable: Array<[number, boolean]> = [
  [0, true],
  [1, true],
  [2, false],
  [3, false],
  [4, false],
  [10, false],
  [-1, false],
  [-5, false],
  [1.5, false],
  [Number.NaN, false],
  [Number.POSITIVE_INFINITY, false],
  [Number.MAX_SAFE_INTEGER, false],
];
for (const [input, expected] of truthTable) {
  check(`isFreeUnitPosition(${String(input)}) === ${expected}`, isFreeUnitPosition(input) === expected);
}
check(
  'isFreeUnitPosition solo devuelve true para 0..FREE_UNITS_PER_SUBJECT-1',
  Array.from({ length: 12 }, (_, i) => i - 1).every((i) => isFreeUnitPosition(i) === (Number.isInteger(i) && i >= 0 && i < FREE_UNITS_PER_SUBJECT)),
);

// --------------------------------------------------------------------------
console.log('--- B. Code de error de contenido bloqueado ---');
check("PREMIUM_REQUIRED_CODE === 'PREMIUM_REQUIRED'", PREMIUM_REQUIRED_CODE === 'PREMIUM_REQUIRED');

// --------------------------------------------------------------------------
console.log('--- C. Schema de GET /me/entitlement (estricto, solo tier) ---');
check("acepta { tier: 'FREE' }", accountEntitlementResponseSchema.safeParse({ tier: 'FREE' }).success);
check("acepta { tier: 'PREMIUM' }", accountEntitlementResponseSchema.safeParse({ tier: 'PREMIUM' }).success);
check("rechaza tier desconocido { tier: 'GOLD' }", !accountEntitlementResponseSchema.safeParse({ tier: 'GOLD' }).success);
check('rechaza objeto vacio {}', !accountEntitlementResponseSchema.safeParse({}).success);
check(
  'rechaza campo extra de pricing',
  !accountEntitlementResponseSchema.safeParse({ tier: 'FREE', pricing: { amount: 6990 } }).success,
);
check(
  'rechaza campo extra de billing (currentPeriodEnd)',
  !accountEntitlementResponseSchema.safeParse({ tier: 'PREMIUM', currentPeriodEnd: '2026-12-01T00:00:00Z' }).success,
);
check(
  'rechaza campo extra arbitrario',
  !accountEntitlementResponseSchema.safeParse({ tier: 'FREE', foo: 'bar' }).success,
);
const parsedFree = accountEntitlementResponseSchema.parse({ tier: 'FREE' });
check('el parseo no agrega claves', Object.keys(parsedFree).length === 1 && Object.keys(parsedFree)[0] === 'tier');

// --------------------------------------------------------------------------
console.log('--- D. Enum de tier ---');
check(
  "premiumTierSchema.options === ['FREE','PREMIUM']",
  JSON.stringify(premiumTierSchema.options) === JSON.stringify(['FREE', 'PREMIUM']),
);

// --------------------------------------------------------------------------
console.log('--- E. Ausencia de pricing / origin en el codigo de Capa 1 ---');
const premiumSrc = readFileSync(join(ROOT, '..', '..', 'packages', 'contracts', 'src', 'premium.ts'), 'utf8');
const premiumCode = stripComments(premiumSrc);
const FORBIDDEN: Array<[string, RegExp]> = [
  ['sin constante de precio', /PRICE|PRECIO/i],
  ['sin bloque/objeto pricing', /\bpricing\b/i],
  ['sin moneda / monto CLP', /\bCLP\b|amountMinor|currency/i],
  ['sin literal de precio 6990 / 6.990', /6990|6[.,]990/],
  ['sin producto de store', /storePurchaseToken|productId|storeMetadata|store_metadata|STORE_METADATA/i],
  ['sin PremiumOrigin / origin de UX', /PremiumOrigin|\borigin\b/i],
  ['sin estado de suscripcion', /autoRenew|currentPeriodEnd|subscriptionStatus|AccountSubscription/i],
];
for (const [label, pattern] of FORBIDDEN) {
  check(`${label} (codigo ejecutable de premium.ts)`, !pattern.test(premiumCode));
}
check(
  'premium.ts no exporta ninguna constante distinta de las 3 aprobadas + schemas',
  (premiumCode.match(/export const (\w+)/g) ?? []).join('\n') ===
    ['export const FREE_UNITS_PER_SUBJECT', 'export const premiumTierSchema', 'export const accountEntitlementResponseSchema', 'export const PREMIUM_REQUIRED_CODE']
      .join('\n'),
);

// --------------------------------------------------------------------------
console.log('--- F. Re-export desde @axioma/contracts ---');
const indexSrc = readFileSync(join(ROOT, '..', '..', 'packages', 'contracts', 'src', 'index.ts'), 'utf8');
check("index.ts re-exporta './premium'", /export \* from '\.\/premium';/.test(indexSrc));
check('los simbolos se importaron correctamente en este gate', typeof isFreeUnitPosition === 'function' && typeof PREMIUM_REQUIRED_CODE === 'string');

// --------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.`);
  process.exit(1);
}
console.log('Todas las verificaciones del gate del contrato de Premium pasaron.');
