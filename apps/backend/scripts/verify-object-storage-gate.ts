// Mismo patrón que los gates anteriores: prueba contra el servidor real ya
// compilado y corriendo. El endpoint de diagnóstico es completamente
// autocontenido (genera su propio archivo de prueba) -- este script no
// necesita ningún archivo externo ni acceso directo a MinIO/Postgres.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:3005';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function roundtrip(scenario: string) {
  const res = await fetch(`${base}/platform/_internal/diagnostics/object-storage-roundtrip?scenario=${scenario}`, {
    method: 'POST',
    headers: { 'x-internal-ops-key': opsKey },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function main() {
  console.log('--- 1. Escenario válido: roundtrip completo (subida, hash, URL firmada, expiración, borrado) ---');
  const rValid = await roundtrip('valid');
  check('status 2xx', rValid.status >= 200 && rValid.status < 300);
  check('validationPassed', rValid.body?.validationPassed === true);
  check('sha256 presente (64 hex chars)', /^[0-9a-f]{64}$/.test(rValid.body?.sha256 ?? ''));
  check('sizeBytes > 0', rValid.body?.sizeBytes > 0);
  check('dimensiones leídas (2x2, fixture de prueba)', rValid.body?.width === 2 && rValid.body?.height === 2);
  check('el contenido descargado coincide con el hash calculado', rValid.body?.downloadMatchesHash === true);
  check('la URL firmada expira realmente pasado su TTL (no solo se documenta)', rValid.body?.urlExpiredAfterTtl === true);
  check(
    'la respuesta nunca incluye una URL firmada (no se persiste ni se expone)',
    !JSON.stringify(rValid.body ?? {}).includes('http'),
  );

  console.log('--- 2. Rechazo: archivo que excede el límite de tamaño configurado ---');
  const rOversized = await roundtrip('oversized-bytes');
  check('status 400', rOversized.status === 400);
  check('code VALIDATION_ERROR', rOversized.body?.error?.code === 'VALIDATION_ERROR');
  check('mensaje menciona el límite de tamaño', /tamaño/i.test(rOversized.body?.error?.message ?? ''));

  console.log('--- 3. Rechazo: tipo MIME no permitido (SVG y otros excluidos por ahora) ---');
  const rMime = await roundtrip('invalid-mime');
  check('status 400', rMime.status === 400);
  check('code VALIDATION_ERROR', rMime.body?.error?.code === 'VALIDATION_ERROR');
  check('mensaje menciona el tipo MIME', /MIME/i.test(rMime.body?.error?.message ?? ''));

  console.log('--- 4. Rechazo: bytes mágicos no coinciden con el Content-Type declarado ---');
  const rMagic = await roundtrip('bad-magic-bytes');
  check('status 400', rMagic.status === 400);
  check('code VALIDATION_ERROR', rMagic.body?.error?.code === 'VALIDATION_ERROR');
  check('mensaje menciona que el contenido no coincide', /no coincide/i.test(rMagic.body?.error?.message ?? ''));

  console.log('--- 5. Rechazo: dimensiones declaradas exceden el máximo configurado ---');
  const rDimensions = await roundtrip('oversized-dimensions');
  check('status 400', rDimensions.status === 400);
  check('code VALIDATION_ERROR', rDimensions.body?.error?.code === 'VALIDATION_ERROR');
  check('mensaje menciona dimensiones', /dimensiones/i.test(rDimensions.body?.error?.message ?? ''));

  console.log('--- 6. Endpoint de diagnóstico exige clave de operaciones ---');
  const rNoKey = await fetch(`${base}/platform/_internal/diagnostics/object-storage-roundtrip?scenario=valid`, {
    method: 'POST',
  });
  check('sin clave -> 401', rNoKey.status === 401);

  console.log('--- 7. La interfaz pública de ObjectStorageService no expone tipos del SDK del proveedor ---');
  const serviceSource = readFileSync(
    join(__dirname, '../src/platform/object-storage/object-storage.service.ts'),
    'utf-8',
  );
  const publicApiSection = serviceSource
    .split('\n')
    .filter((line) => /^\s*(async\s+)?(putObject|getSignedReadUrl|deleteObject)\(/.test(line) || /^export interface/.test(line))
    .join('\n');
  check(
    'ningún método público ni la interfaz exportada mencionan tipos de @aws-sdk',
    !/S3Client|Command|@aws-sdk/.test(publicApiSection),
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de OBJECT-STORAGE pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
