// ASSET-2 (Escalado del pipeline real a un lote de cosméticos) -- script de
// datos GENÉRICO, mismo pipeline real ya demostrado por ASSET-1: sube cada
// asset al bucket MinIO/S3 público dedicado ya existente
// (`{OBJECT_STORAGE_BUCKET}-cosmetics-public`, reutilizado, nunca creado de
// nuevo), crea/asegura su CosmeticItem, y otorga InventoryItem a la cuenta
// indicada. Deliberadamente NO equipa nada -- eso se hace a mano desde
// Personalización en Android (la validación de ASSET-2 es justamente poder
// elegir entre varias opciones reales).
//
// Diferencia deliberada frente a seed-asset1-test-cosmetics.ts: las claves
// de objeto NO llevan timestamp. ASSET-1 detectó que una clave con
// `Date.now()` genera un objeto MinIO nuevo (huérfano) en cada re-run. Este
// script usa una clave determinista `asset2/{slug}.{ext}` -- volver a
// correrlo con el mismo slug SOBRESCRIBE el mismo objeto, nunca duplica.
//
// Uso:
//   tsx scripts/seed-asset2-cosmetics.ts --account-id=<uuid>
//
// El lote de 6 ítems (slug, tipo, nombre, ruta de archivo) está declarado
// abajo en BATCH -- ningún identificador de cuenta ni ruta personal queda
// hardcodeado fuera de este archivo de script de datos (mismo criterio que
// ASSET-1: herramienta DEV parametrizada por CLI, nunca un endpoint).
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '../src/generated/prisma/client';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import type { CosmeticSlot } from '../src/generated/prisma/client';

const ASSETS_DIR = 'C:/Users/usuario 4/Downloads/ZETRYND-ASSETS perfil/';

const BATCH: Array<{ slug: string; itemKey: string; itemType: CosmeticSlot; name: string; file: string }> = [
  { slug: 'avatar-pi', itemKey: 'asset2-avatar-pi', itemType: 'AVATAR', name: 'Pi', file: `${ASSETS_DIR}avatar PI 1.2.webp` },
  { slug: 'avatar-astrolabio', itemKey: 'asset2-avatar-astrolabio', itemType: 'AVATAR', name: 'Astrolabio', file: `${ASSETS_DIR}avatar astrolabio 1.webp` },
  { slug: 'avatar-humano-lentes', itemKey: 'asset2-avatar-humano-lentes', itemType: 'AVATAR', name: 'Estudiante con lentes', file: `${ASSETS_DIR}avatar humano con lentes 1.webp` },
  { slug: 'frame-plata', itemKey: 'asset2-frame-plata', itemType: 'AVATAR_FRAME', name: 'Marco de plata', file: `${ASSETS_DIR}marco plata 1.png` },
  { slug: 'frame-bronce', itemKey: 'asset2-frame-bronce', itemType: 'AVATAR_FRAME', name: 'Marco de bronce', file: `${ASSETS_DIR}marco bronce 1.1.png` },
  { slug: 'banner-observatorio-horizonte', itemKey: 'asset2-banner-observatorio-horizonte', itemType: 'PROFILE_BANNER', name: 'Observatorio del Horizonte', file: `${ASSETS_DIR}banner observatorio 1.webp` },
];

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function detectContentType(path: string): string {
  const ext = extname(path).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType) throw new Error(`Extensión no soportada para "${path}" -- usa PNG/JPG/WebP.`);
  return contentType;
}

function cosmeticsBucketName(baseBucket: string): string {
  return `${baseBucket}-cosmetics-public`;
}

async function ensurePublicBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`  Bucket "${bucket}" ya existe (reutilizado, mismo bucket de ASSET-1).`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`  Bucket "${bucket}" creado (no existía).`);
  }
  const policy = {
    Version: '2012-10-17',
    Statement: [{ Sid: 'PublicReadCosmetics', Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${bucket}/*`] }],
  };
  await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const accountIdFlag = rawArgs.find((a) => a.startsWith('--account-id='));
  const accountId = accountIdFlag?.slice('--account-id='.length);
  if (!accountId) {
    console.error('Uso: tsx scripts/seed-asset2-cosmetics.ts --account-id=<uuid>');
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

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error(`No existe ninguna Account con id "${accountId}".`);
  console.log(`--- Cuenta confirmada: ${accountId} (status=${account.status}) ---`);

  console.log('--- 0. Verificación de archivos fuente ---');
  for (const item of BATCH) {
    if (!existsSync(item.file)) throw new Error(`Archivo no encontrado para "${item.slug}": ${item.file}`);
  }
  console.log(`  Los ${BATCH.length} archivos fuente existen.`);

  console.log('--- 1. Bucket público de cosméticos (reutilizado de ASSET-1) ---');
  await ensurePublicBucket(s3, bucket);

  const grantedInventory: string[] = [];

  for (const item of BATCH) {
    console.log(`--- ${item.slug} (${item.itemType}) ---`);
    const key = `asset2/${item.slug}${extname(item.file).toLowerCase()}`;

    const alreadyThere = await objectExists(s3, bucket, key);
    const body = readFileSync(item.file);
    const contentType = detectContentType(item.file);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    const assetUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    console.log(`  storage: ${alreadyThere ? 'objeto ya existía -- sobrescrito con el mismo key (sin duplicar)' : 'objeto subido'} -> ${assetUrl}`);

    let cosmeticItem = await cosmeticItemRepo.findByItemKey(item.itemKey);
    if (cosmeticItem) {
      if (cosmeticItem.assetReference !== assetUrl) {
        cosmeticItem = await prisma.cosmeticItem.update({ where: { id: cosmeticItem.id }, data: { assetReference: assetUrl } });
        console.log(`  CosmeticItem "${item.itemKey}" ya existía -- assetReference actualizado.`);
      } else {
        console.log(`  CosmeticItem "${item.itemKey}" ya existía -- sin cambios.`);
      }
    } else {
      cosmeticItem = await cosmeticItemRepo.create({
        itemKey: item.itemKey,
        itemType: item.itemType,
        name: item.name,
        rarityClass: 'COMMON',
        assetReference: assetUrl,
        visibilityStatus: 'PUBLIC',
      });
      console.log(`  CosmeticItem "${item.itemKey}" creado (id=${cosmeticItem.id}).`);
    }

    const { inventoryItem, created } = await inventoryItemRepo.createIdempotent({
      accountId,
      cosmeticItemId: cosmeticItem.id,
      acquisitionSourceType: 'LEVEL',
      acquisitionSourceId: `asset2-seed:${accountId}`,
      acquiredAt: new Date(),
    });
    console.log(`  InventoryItem: ${inventoryItem.id} (${created ? 'otorgado ahora' : 'ya existía'}) -- SIN EQUIPAR`);
    grantedInventory.push(item.slug);
  }

  console.log('--- Resumen ---');
  console.log(`Otorgados/asegurados sin equipar: ${grantedInventory.join(', ')}`);
  console.log('Ningún EquippedCosmetic existente fue tocado. Equipa manualmente desde Personalización en Android.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
