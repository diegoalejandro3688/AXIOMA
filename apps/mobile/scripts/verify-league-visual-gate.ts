// Gate del rediseño visual de Competir V1 -- Incremento 1 ("Assets + league
// visual primitives"). Verifica la lógica PURA de `lib/league/league-visual.ts`
// (sin runtime de React Native, mismo criterio que verify-league-participation-gate.ts)
// y comprueba ESTÁTICAMENTE que los 8 assets aprobados existen y que los
// componentes (`LeagueEmblem`/`LeagueTrophy`) los referencian todos.
//
// NO reemplaza la verificación manual en dispositivo físico (render real de
// cada escudo, claro/oscuro, sin deformación) -- eso es QA Android.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  leagueVisual,
  leagueKey,
  leagueName,
  clampLeagueTier,
  LEAGUE_TIERS,
  LEAGUE_TIER_MIN,
  LEAGUE_TIER_MAX,
  type LeagueKey,
} from '../lib/league/league-visual';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const EXPECTED_KEYS: LeagueKey[] = ['bronze', 'silver', 'gold', 'emerald', 'diamond', 'master', 'grand-master'];
const MOBILE_ROOT = join(__dirname, '..');

function main() {
  console.log('--- 1. Los 7 tiers mapean a 7 escudos distintos, en orden ---');
  check('LEAGUE_TIERS === [1..7]', LEAGUE_TIERS.length === 7 && LEAGUE_TIERS.every((t, i) => t === i + 1));
  const keysLight = LEAGUE_TIERS.map((t) => leagueVisual(t, 'light').key);
  check('claves en orden exacto (bronze..grand-master)', JSON.stringify(keysLight) === JSON.stringify(EXPECTED_KEYS));
  check('7 claves DISTINTAS', new Set(keysLight).size === 7);
  check('leagueKey() coincide con leagueVisual().key', LEAGUE_TIERS.every((t) => leagueKey(t) === leagueVisual(t, 'dark').key));

  console.log('--- 2. Cada tier tiene nombre + accent/tint/halo hex válidos en ambos esquemas ---');
  for (const t of LEAGUE_TIERS) {
    const l = leagueVisual(t, 'light');
    const d = leagueVisual(t, 'dark');
    check(`tier ${t}: nombre no vacío ("${l.name}")`, typeof l.name === 'string' && l.name.length > 0 && l.name === leagueName(t));
    check(`tier ${t}: light accent/tint/halo son hex`, HEX.test(l.accent) && HEX.test(l.tint) && HEX.test(l.halo));
    check(`tier ${t}: dark accent/tint/halo son hex`, HEX.test(d.accent) && HEX.test(d.tint) && HEX.test(d.halo));
    check(`tier ${t}: claro y oscuro difieren (accent+tint)`, l.accent !== d.accent && l.tint !== d.tint);
    check(`tier ${t}: tier devuelto === solicitado`, l.tier === t && d.tier === t);
  }

  console.log('--- 3. clampLeagueTier: fuera de rango cae al más cercano, nunca revienta ---');
  check('0 -> 1', clampLeagueTier(0) === LEAGUE_TIER_MIN);
  check('-5 -> 1', clampLeagueTier(-5) === LEAGUE_TIER_MIN);
  check('8 -> 7', clampLeagueTier(8) === LEAGUE_TIER_MAX);
  check('999 -> 7', clampLeagueTier(999) === LEAGUE_TIER_MAX);
  check('3.4 -> 3', clampLeagueTier(3.4) === 3);
  check('NaN -> 1', clampLeagueTier(Number.NaN) === LEAGUE_TIER_MIN);
  check('leagueVisual(99) no lanza y cae a Gran Maestro', leagueVisual(99, 'light').key === 'grand-master');

  console.log('--- 4. Los 8 assets aprobados existen en assets/competitive/ ---');
  const assetDir = join(MOBILE_ROOT, 'assets', 'competitive');
  for (const key of EXPECTED_KEYS) {
    check(`league-${key}.webp existe`, existsSync(join(assetDir, `league-${key}.webp`)));
  }
  check('trophy-lp.webp existe', existsSync(join(assetDir, 'trophy-lp.webp')));

  console.log('--- 5. LeagueEmblem referencia los 7 escudos; LeagueTrophy referencia el trofeo ---');
  const emblemSrc = readFileSync(join(MOBILE_ROOT, 'components', 'competitive', 'league-emblem.tsx'), 'utf8');
  for (const key of EXPECTED_KEYS) {
    check(`league-emblem.tsx referencia el asset league-${key}.webp`, emblemSrc.includes(`league-${key}.webp`));
  }
  check('league-emblem.tsx usa resizeMode="contain"', emblemSrc.includes('resizeMode="contain"'));
  check('league-emblem.tsx NO usa resizeMode="cover" (no recorta)', !emblemSrc.includes('resizeMode="cover"'));
  const trophySrc = readFileSync(join(MOBILE_ROOT, 'components', 'competitive', 'league-trophy.tsx'), 'utf8');
  check('league-trophy.tsx referencia el asset trophy-lp.webp', trophySrc.includes('trophy-lp.webp'));
  check('league-trophy.tsx usa resizeMode="contain"', trophySrc.includes('resizeMode="contain"'));

  console.log('--- 6. Los hex crudos de liga viven SOLO en league-visual.ts ---');
  const visualSrc = readFileSync(join(MOBILE_ROOT, 'lib', 'league', 'league-visual.ts'), 'utf8');
  check('league-visual.ts contiene la paleta de hex', /#[0-9A-Fa-f]{6}/.test(visualSrc));
  check('league-emblem.tsx NO define hex crudos (deriva de leagueVisual)', !/#[0-9A-Fa-f]{6}/.test(emblemSrc));
  check('league-trophy.tsx NO define hex crudos', !/#[0-9A-Fa-f]{6}/.test(trophySrc));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de identidad visual de liga (Competir V1, Incremento 1) pasaron.');
}

main();
