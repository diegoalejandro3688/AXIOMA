// PS-0C.2 (Increment B) -- gate del endurecimiento de moderación de nombres
// de usuario. PURO: no abre Postgres, no levanta servidor, no toca la red.
// Ejercita `violatesUsernamePolicy` / `isReservedOrOffensive` directamente.
//
// Cubre PS-0C.2 §49: casos POSITIVOS (usernames legítimos representativos de
// estudiantes chilenos, incluidos algunos adyacentes a patrones bloqueados)
// y NEGATIVOS (suplantación administrativa / de ZETRYND, groserías claras,
// slurs, sexual, amenaza, evasión leet obvia).
import { isReservedOrOffensive, violatesUsernamePolicy, normalizeForModeration } from '../src/user/reserved-usernames';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

// Todos ya en forma canónica del schema (`^[a-z0-9_]{3,20}$`, minúsculas).
const ALLOWED = [
  'diego2007', 'javiera_r', 'benja_paes', 'matias_soto', 'cata_ln',
  'estudiante_2026', 'fran_ciencias', 'nico88', 'valentina_g', 'seba_mate',
  'tomas_history', 'anaisabel', 'kevin_2008', 'pipe_lector', 'dani_qz',
  // adyacentes a patrones bloqueados -- NO deben ser falsos positivos:
  'analista', 'escaneo', 'clasico', 'pescador', 'especialista', 'conexion',
  'asignatura', 'concepto', 'circunstancia', 'experto', 'grape_juice',
  'sportfan', 'passenger', 'classroom', 'assessment',
];

const BLOCKED = [
  // suplantación administrativa / ZETRYND / instituciones
  'admin', 'administrador', 'moderador', 'soporte', 'staff', 'zetrynd',
  'zetryndoficial', 'equipozetrynd', 'zetryndstaff', 'adminzetrynd',
  'paes', 'demre', 'mineduc', 'sistema',
  // evasión leet de lo anterior
  '4dm1n', 'admin_', 'a_d_m_i_n', 'zetrynd0ficial', 's0p0rte',
  // groserías / slurs claros (ES)
  'conchetumare', 'hijodeputa', 'reculiao', 'maricon', 'putamadre',
  'imbecil123', 'gilipollas', 'aweonao',
  // groserías / slurs (EN)
  'fuckyou', 'shithead', 'bitchboy', 'nigger', 'faggot99',
  // sexual / abuso
  'pornhub', 'rapist', 'pedophile_', 'zoofilia', 'incesto',
  // amenaza / odio
  'tevoyamatar', 'suicidate', 'heilhitler', 'whitepower',
];

console.log('=== PS-0C.2 -- gate de moderación de nombres de usuario ===\n');

console.log('--- A. usernames LEGÍTIMOS (nunca bloqueados) ---');
for (const u of ALLOWED) {
  check(`permite "${u}"`, violatesUsernamePolicy(u) === false && isReservedOrOffensive(u) === false);
}

console.log('\n--- B. usernames INFRACTORES (siempre bloqueados) ---');
for (const u of BLOCKED) {
  check(`bloquea "${u}"`, violatesUsernamePolicy(u) === true && isReservedOrOffensive(u) === true);
}

console.log('\n--- C. normalización leet ---');
check('4dm1n -> admin', normalizeForModeration('4dm1n') === 'admin');
check('s0p0rte -> soporte', normalizeForModeration('s0p0rte') === 'soporte');
check('a_d_m_i_n -> admin', normalizeForModeration('a_d_m_i_n') === 'admin');
check('texto sólo-alfabético inalterado', normalizeForModeration('javieracontenta') === 'javieracontenta');
check('quita guiones bajos', normalizeForModeration('ana_isabel') === 'anaisabel');

console.log('\n--- D. materialmente más fuerte que la lista de 3 previa ---');
check('la lista de subcadenas bloqueadas creció > 20 entradas', require('../src/user/reserved-usernames').OFFENSIVE_USERNAMES.size > 20);

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallida(s).`);
  process.exit(1);
}
console.log('\nTodas las verificaciones pasaron.');
