// ASSET-1 (Integración de assets reales, pipeline mínimo) -- script de datos
// GENÉRICO parametrizado por CLI, nunca un endpoint de producto. Sube los 3
// assets reales a un bucket MinIO/S3 dedicado con lectura pública, crea/
// asegura los 3 CosmeticItem (AVATAR, AVATAR_FRAME, PROFILE_BANNER) y otorga
// el inventario a la cuenta indicada.
//
// AVATAR-RECON: el avatar ya sigue el mismo modelo que marco/banner --
// CosmeticItem -> InventoryItem -- en vez de fijar
// PublicProfile.avatarReference directamente. CompetitiveProfileIdentityService
// resuelve el avatar visible desde el cosmético equipado en el slot AVATAR
// (equipped_cosmetic), nunca desde avatarReference.
//
// Deliberadamente NO equipa marco, banner ni avatar -- eso se hace a mano
// desde Personalización en Android para validar el flujo real de
// equipamiento.
//
// Uso:
//   tsx scripts/seed-asset1-test-cosmetics.ts <username> <avatarPngPath> <framePngPath> <bannerPngPath>
//   tsx scripts/seed-asset1-test-cosmetics.ts --account-id=<uuid> <avatarPngPath> <framePngPath> <bannerPngPath>
//
// El identificador de cuenta (username o --account-id) y las rutas de
// archivo se reciben SIEMPRE por argumento -- ningún identificador de
// cuenta ni ruta personal queda hardcodeado aquí.
//
// --account-id resuelve DIRECTO por Account.id (verifica que la cuenta
// exista antes de tocar nada) -- útil cuando la cuenta todavía no reclamó
// ningún username (sin PublicProfile). El otorgamiento de inventario
// (marco/banner) no depende de PublicProfile y procede igual. El paso de
// avatarReference SÍ requiere un PublicProfile existente -- si la cuenta
// no tiene uno, el script NO lo crea/reclama por su cuenta (eso es
// POST /user/public-profile, el mecanismo real de la app, nunca una
// operación de datos): se omite ese paso y se reporta explícitamente.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '../src/generated/prisma/client';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function normalizeUsername(raw: string): string {
  // Mismo criterio que UserService (user.service.ts:450) -- NFC + minúsculas.
  return raw.normalize('NFC').toLowerCase();
}

/** Claves de objeto SIN espacios ni caracteres fuera de [A-Za-z0-9._-] -- un espacio literal en la URL rompe `curl`/algunos cargadores de imagen nativos en Android, aunque MinIO lo sirva igual con la ruta codificada. */
function sanitizeObjectKeySegment(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectContentType(path: string): string {
  const ext = extname(path).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType) throw new Error(`Extensión no soportada para "${path}" -- usa PNG/JPG/WebP.`);
  return contentType;
}

/**
 * Bucket DEDICADO para cosméticos con ACL de lectura pública (DG ASSET1-3,
 * Opción A del handoff) -- deliberadamente SEPARADO del bucket de contenido
 * educativo (`OBJECT_STORAGE_BUCKET`, privado, servido vía URLs firmadas de
 * corta duración por `ObjectStorageService`, ver ADR-0010). Mezclar ambos
 * en el mismo bucket forzaría una política pública sobre contenido que hoy
 * es privado por diseño -- este script nunca importa/toca
 * `ObjectStorageService` ni sus credenciales de otra forma que reusar las
 * mismas variables de entorno ya existentes.
 */
function cosmeticsBucketName(baseBucket: string): string {
  return `${baseBucket}-cosmetics-public`;
}

async function ensurePublicBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" creado (no existía).`);
  }

  // Política de lectura pública SOLO para este bucket dedicado -- ningún
  // otro bucket (en particular el de contenido educativo) se ve afectado.
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadCosmetics',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
  await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
  console.log(`Política de lectura pública aplicada a "${bucket}".`);
}

async function uploadPublicAsset(client: S3Client, bucket: string, endpoint: string, key: string, filePath: string): Promise<string> {
  const body = readFileSync(filePath);
  const contentType = detectContentType(filePath);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  // forcePathStyle (igual que ObjectStorageService) -- URL pública directa, sin firmar, estable mientras el bucket sea público.
  return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const accountIdFlag = rawArgs.find((a) => a.startsWith('--account-id='));
  const positional = rawArgs.filter((a) => !a.startsWith('--account-id='));
  const [usernameArg, avatarPath, framePath, bannerPath] = accountIdFlag ? [undefined, ...positional] : positional;
  const accountIdArg = accountIdFlag?.slice('--account-id='.length);

  if ((!usernameArg && !accountIdArg) || !avatarPath || !framePath || !bannerPath) {
    console.error(
      'Uso:\n' +
        '  tsx scripts/seed-asset1-test-cosmetics.ts <username> <avatarPngPath> <framePngPath> <bannerPngPath>\n' +
        '  tsx scripts/seed-asset1-test-cosmetics.ts --account-id=<uuid> <avatarPngPath> <framePngPath> <bannerPngPath>',
    );
    process.exit(1);
  }

  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  if (!endpoint) throw new Error('OBJECT_STORAGE_ENDPOINT no está configurado en el entorno.');
  const baseBucket = process.env.OBJECT_STORAGE_BUCKET ?? 'axioma-content-dev';
  const bucket = cosmeticsBucketName(baseBucket);

  const s3 = new S3Client({
    endpoint,
    region: process.env.OBJECT_STORAGE_REGION ?? 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? '',
    },
  });

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;

  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);

  let accountId: string;
  let profile: Awaited<ReturnType<typeof prisma.publicProfile.findUnique>> = null;

  if (accountIdArg) {
    const account = await prisma.account.findUnique({ where: { id: accountIdArg } });
    if (!account) throw new Error(`No existe ninguna Account con id "${accountIdArg}".`);
    accountId = account.id;
    profile = await prisma.publicProfile.findUnique({ where: { accountId } });
    console.log(`--- Cuenta resuelta por accountId: ${accountId} (status=${account.status}, PublicProfile=${profile ? `"${profile.usernameNormalized}"` : 'NINGUNO'}) ---`);
  } else {
    const usernameNormalized = normalizeUsername(usernameArg!);
    profile = await prisma.publicProfile.findUnique({ where: { usernameNormalized } });
    if (!profile) throw new Error(`No existe ningún PublicProfile con username "${usernameArg}" (normalizado: "${usernameNormalized}").`);
    accountId = profile.accountId;
    console.log(`--- Cuenta resuelta por username: accountId=${accountId} (username="${usernameArg}") ---`);
  }

  console.log('--- 1. Bucket público de cosméticos ---');
  await ensurePublicBucket(s3, bucket);

  console.log('--- 2. Subida de los 3 assets reales ---');
  const stamp = Date.now();
  const avatarKey = `asset1/${stamp}-${sanitizeObjectKeySegment(basename(avatarPath))}`;
  const frameKey = `asset1/${stamp}-${sanitizeObjectKeySegment(basename(framePath))}`;
  const bannerKey = `asset1/${stamp}-${sanitizeObjectKeySegment(basename(bannerPath))}`;

  const avatarUrl = await uploadPublicAsset(s3, bucket, endpoint, avatarKey, avatarPath);
  const frameUrl = await uploadPublicAsset(s3, bucket, endpoint, frameKey, framePath);
  const bannerUrl = await uploadPublicAsset(s3, bucket, endpoint, bannerKey, bannerPath);
  console.log(`  avatar -> ${avatarUrl}`);
  console.log(`  marco  -> ${frameUrl}`);
  console.log(`  banner -> ${bannerUrl}`);

  console.log('--- 3. CosmeticItem (AVATAR, AVATAR_FRAME, PROFILE_BANNER) ---');
  // CosmeticItemRepository no tiene upsert (inmutable por diseño) -- se
  // reutiliza el ítem existente si el script ya se ejecutó antes con la
  // misma itemKey, en vez de fallar por la restricción UNIQUE.
  async function ensureCosmeticItem(input: Parameters<CosmeticItemRepository['create']>[0]) {
    const existing = await cosmeticItemRepo.findByItemKey(input.itemKey);
    if (existing) {
      if (existing.assetReference !== input.assetReference) {
        // `CosmeticItemRepository` no expone update() (inmutable por diseño de producto) --
        // esta es una corrección de DATOS de un re-run del propio script (misma URL
        // re-subida con una key nueva), no una escritura de dominio; se hace vía Prisma
        // directo, igual que el ajuste de avatarReference en el paso 5.
        const updated = await prisma.cosmeticItem.update({ where: { id: existing.id }, data: { assetReference: input.assetReference } });
        console.log(`  "${input.itemKey}" ya existía (id=${existing.id}) -- assetReference actualizado a la última subida.`);
        return updated;
      }
      console.log(`  "${input.itemKey}" ya existía (id=${existing.id}) -- reutilizado, sin cambios.`);
      return existing;
    }
    const created = await cosmeticItemRepo.create(input);
    console.log(`  "${input.itemKey}" creado (id=${created.id}).`);
    return created;
  }

  const avatarItem = await ensureCosmeticItem({
    itemKey: 'asset1-avatar-buho',
    itemType: 'AVATAR',
    name: 'Búho (avatar base)',
    rarityClass: 'COMMON',
    assetReference: avatarUrl,
    visibilityStatus: 'PUBLIC',
  });

  const frameItem = await ensureCosmeticItem({
    itemKey: 'asset1-frame-madera-nivel5',
    itemType: 'AVATAR_FRAME',
    name: 'Marco de madera (nivel 5)',
    rarityClass: 'COMMON',
    assetReference: frameUrl,
    visibilityStatus: 'PUBLIC',
  });

  const bannerItem = await ensureCosmeticItem({
    itemKey: 'asset1-banner-templo-conocimiento',
    itemType: 'PROFILE_BANNER',
    name: 'Templo del Conocimiento',
    rarityClass: 'COMMON',
    assetReference: bannerUrl,
    visibilityStatus: 'PUBLIC',
  });

  console.log('--- 4. Inventario (sin equipar) -- no depende de PublicProfile ---');
  const { inventoryItem: avatarInventory, created: avatarGranted } = await inventoryItemRepo.createIdempotent({
    accountId,
    cosmeticItemId: avatarItem.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `asset1-seed:${accountId}`,
    acquiredAt: new Date(),
  });
  console.log(`  avatar: inventoryItemId=${avatarInventory.id} (${avatarGranted ? 'otorgado ahora' : 'ya existía'})`);

  const { inventoryItem: frameInventory, created: frameGranted } = await inventoryItemRepo.createIdempotent({
    accountId,
    cosmeticItemId: frameItem.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `asset1-seed:${accountId}`,
    acquiredAt: new Date(),
  });
  console.log(`  marco: inventoryItemId=${frameInventory.id} (${frameGranted ? 'otorgado ahora' : 'ya existía'})`);

  const { inventoryItem: bannerInventory, created: bannerGranted } = await inventoryItemRepo.createIdempotent({
    accountId,
    cosmeticItemId: bannerItem.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `asset1-seed:${accountId}`,
    acquiredAt: new Date(),
  });
  console.log(`  banner: inventoryItemId=${bannerInventory.id} (${bannerGranted ? 'otorgado ahora' : 'ya existía'})`);

  if (!profile) {
    console.log('--- Nota: cuenta sin PublicProfile ---');
    console.log('  Esta cuenta todavía no tiene ningún PublicProfile (no reclamó ningún username). El');
    console.log('  inventario (avatar/marco/banner) ya quedó otorgado -- reclama un username desde la app');
    console.log('  (POST /user/public-profile) para poder equipar cosméticos y ver identidad pública.');
  }

  console.log('--- Resumen ---');
  console.log('Avatar, marco y banner quedaron OTORGADOS pero SIN EQUIPAR -- equípalos manualmente desde Personalización en Android.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
