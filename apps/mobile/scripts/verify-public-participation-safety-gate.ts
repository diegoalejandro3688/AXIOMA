// PS-0C.2 (Increment C) -- gate ESTÁTICO del wiring mobile de compliance:
// Términos de participación pública, reporte/bloqueo, gestión de bloqueos,
// enlaces legales/soporte. Escaneo de fuente (mismo criterio que otros
// gates mobile estáticos) -- no levanta app, no red, no snapshots.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else { console.error(`FALLO  ${label}`); failures += 1; }
}

const ROOT = join(__dirname, '..');
const read = (...seg: string[]) => readFileSync(join(ROOT, ...seg), 'utf8');

console.log('=== PS-0C.2 -- gate estático del wiring mobile de compliance ===\n');

// --- A. API wrappers ---
const compliance = read('lib', 'api', 'compliance.ts');
check('A1. compliance.ts -> GET /me/public-participation-terms', compliance.includes("'/me/public-participation-terms'"));
check('A2. compliance.ts -> POST /me/public-participation-terms/accept', compliance.includes("/me/public-participation-terms/accept"));
check('A3. accept usa CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION del contrato (no string mágico)', compliance.includes('CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION') && !/version:\s*['"]20\d\d-/.test(compliance));

const safety = read('lib', 'api', 'safety.ts');
check('A4. safety.ts -> POST /user/safety/reports/:username', safety.includes('/user/safety/reports/'));
check('A5. safety.ts -> POST + DELETE /user/safety/blocks/:username', safety.includes("'POST', `/user/safety/blocks/") && safety.includes("'DELETE', `/user/safety/blocks/"));
check('A6. safety.ts -> GET /user/safety/blocks', safety.includes("'/user/safety/blocks'"));

// --- B. Sin texto libre en el reporte ---
const reportCats = read('lib', 'safety', 'report-categories.ts');
check('B1. exactamente 3 categorías de reporte', (reportCats.match(/value:\s*'/g) ?? []).length === 3);
check('B2. sin campo de texto libre / "cuéntanos más"', !/description|comentario|textarea|TextInput/i.test(reportCats));
const usernameScreen = read('app', '(tabs)', 'competir', 'perfil', '[username].tsx');
check('B3. pantalla de perfil: acción "Reportar usuario"', usernameScreen.includes('Reportar usuario') && usernameScreen.includes('reportPublicProfile'));
check('B4. pantalla de perfil: acción "Bloquear usuario"', usernameScreen.includes('Bloquear usuario') && usernameScreen.includes('blockUser'));
check('B5. reporte sin TextInput de texto libre en la pantalla', !usernameScreen.includes('<TextInput'));

// --- C. Gate de Términos antes de HACER PÚBLICO ---
const perfil = read('app', '(tabs)', 'perfil', 'index.tsx');
check('C1. perfil: consulta estado de Términos antes de hacer visible', perfil.includes('getPublicParticipationTermsStatus') && perfil.includes('nextVisible'));
check('C2. perfil: maneja PUBLIC_TERMS_ACCEPTANCE_REQUIRED como fallback', perfil.includes('COMPLIANCE_ERROR_CODES.PUBLIC_TERMS_ACCEPTANCE_REQUIRED'));
check('C3. perfil: aceptar -> reintenta la acción original (applyVisibility(true))', perfil.includes('handleAcceptTermsAndContinue') && /handleAcceptTermsAndContinue[\s\S]{0,400}applyVisibility\(true\)/.test(perfil));
check('C4. perfil: Cancelar no publica (cierra el prompt sin llamar visibility)', perfil.includes('setTermsPromptVisible(false)'));

// --- D. Pantalla de Términos versionada ---
const terminos = read('app', '(tabs)', 'perfil', 'terminos.tsx');
const content = read('lib', 'compliance', 'public-participation-terms-content.ts');
check('D1. terminos.tsx existe y muestra versión + botón aceptar condicional', terminos.includes('PUBLIC_PARTICIPATION_TERMS_VERSION') && terminos.includes('isCurrent') && terminos.includes('Aceptar términos'));
check('D2. contenido cubre: username apropiado, no ofensivo/discriminatorio, no sexual, no amenazas', /apropiado/i.test(content) && /ofensivo/i.test(content) && /sexualmente inapropiado/i.test(content) && /amenaza/i.test(content));
check('D3. contenido cubre: no suplantación (ZETRYND/soporte/instituciones/personas)', /suplant|hagas pasar/i.test(content) && /instituciones/i.test(content));
check('D4. contenido: reportes de buena fe + participación opcional + funciones privadas siguen', /buena fe/i.test(content) && /opcional/i.test(content) && /privad/i.test(content));
check('D5. versión NO hardcodeada -- viene del contrato', content.includes('CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION') && !/=\s*['"]20\d\d-\d\d-\d\d['"]/.test(content));

// --- E. Enlaces legales / soporte (fail-safe, sin URLs falsas) ---
const links = read('lib', 'compliance', 'legal-links.ts');
check('E1. PRIVACY_POLICY_URL y SUPPORT_CONTACT son null (no configurados)', /PRIVACY_POLICY_URL:\s*string\s*\|\s*null\s*=\s*null/.test(links) && /SUPPORT_CONTACT:\s*string\s*\|\s*null\s*=\s*null/.test(links));
check('E2. sin placeholders falsos (example.com / zetrynd.app / mailto ficticio)', !/example\.com|@zetrynd\.app|support@|noreply@/i.test(links));
check('E3. perfil: fila Privacidad/Soporte deshabilitada si no configurada ("Disponible próximamente")', perfil.includes('Disponible próximamente') && perfil.includes('isConfigured(PRIVACY_POLICY_URL)') && perfil.includes('isConfigured(SUPPORT_CONTACT)'));
check('E4. perfil: fila "Términos de uso" navega a la pantalla interna', perfil.includes("router.push('/(tabs)/perfil/terminos')"));
check('E5. perfil: NO abre URL cuando el valor es null', /isConfigured\(PRIVACY_POLICY_URL\)\)\s*void Linking\.openURL/.test(perfil));

// --- F. Gestión de usuarios bloqueados ---
const bloqueados = read('app', '(tabs)', 'perfil', 'usuarios-bloqueados.tsx');
check('F1. pantalla usuarios-bloqueados: lista + desbloquear', bloqueados.includes('listBlockedUsers') && bloqueados.includes('unblockUser') && bloqueados.includes('Desbloquear'));
check('F2. perfil enlaza "Usuarios bloqueados"', perfil.includes("router.push('/(tabs)/perfil/usuarios-bloqueados')"));
const layout = read('app', '(tabs)', 'perfil', '_layout.tsx');
check('F3. rutas registradas en el layout', layout.includes('name="terminos"') && layout.includes('name="usuarios-bloqueados"'));

// --- G. Ranking: etiqueta "Usuario bloqueado" para redacción por bloqueo ---
const ranking = read('app', '(tabs)', 'competir', 'ranking.tsx');
check('G1. ranking distingue redactionReason BLOCKED -> "Usuario bloqueado"', /redactionReason === 'BLOCKED'\s*\?\s*'Usuario bloqueado'\s*:\s*'Perfil privado'/.test(ranking));
check('G2. ranking sigue sin navegar desde una fila redactada', /if \(!row\.presentable\)/.test(ranking));

// --- H. Sin expansión de superficie UGC ---
const noExpand = [usernameScreen, perfil, terminos, bloqueados].join('\n');
check('H1. sin bio / posts / comentarios / chat / DMs / follow / upload de foto', !/\bbio\b|comentario|\bchat\b|mensaje directo|seguir a|follow|subir foto|image.?picker/i.test(noExpand));

if (failures > 0) { console.error(`\n${failures} verificación(es) fallida(s).`); process.exit(1); }
console.log('\nTodas las verificaciones pasaron.');
