import { createHash } from 'node:crypto';
import { imageSize } from 'image-size';
import type { ConfigService } from '@nestjs/config';

/**
 * Validación de subida -- ver docs/adr/0010-almacenamiento-de-contenido.md.
 * SVG deliberadamente excluido por ahora (riesgo de contenido activo
 * embebido) -- solo raster. Los límites NUNCA están fijos en código: se
 * leen de configuración, con un default documentado solo como fallback.
 */

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

/** Sniffing real de bytes -- nunca confiar únicamente en el Content-Type declarado. */
const MAGIC_BYTES: Record<AllowedMimeType, (buf: Buffer) => boolean> = {
  'image/png': (buf) =>
    buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/webp': (buf) =>
    buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP',
};

export class ObjectValidationError extends Error {}

export interface ObjectUploadLimits {
  maxSizeBytes: number;
  maxWidthPx: number;
  maxHeightPx: number;
}

/** Defaults SOLO como fallback si la configuración no fija un valor -- nunca el único mecanismo. */
const DEFAULT_LIMITS: ObjectUploadLimits = {
  maxSizeBytes: 5 * 1024 * 1024,
  maxWidthPx: 4000,
  maxHeightPx: 4000,
};

/** `ConfigService.get<number>()` NO convierte el string de `process.env` -- hay que parsearlo explícitamente. */
function readIntEnv(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveUploadLimits(config: ConfigService): ObjectUploadLimits {
  return {
    maxSizeBytes: readIntEnv(config, 'OBJECT_STORAGE_MAX_FILE_SIZE_BYTES', DEFAULT_LIMITS.maxSizeBytes),
    maxWidthPx: readIntEnv(config, 'OBJECT_STORAGE_MAX_WIDTH_PX', DEFAULT_LIMITS.maxWidthPx),
    maxHeightPx: readIntEnv(config, 'OBJECT_STORAGE_MAX_HEIGHT_PX', DEFAULT_LIMITS.maxHeightPx),
  };
}

export interface ValidatedObject {
  sha256: string;
  sizeBytes: number;
  contentType: AllowedMimeType;
  width: number;
  height: number;
}

/**
 * Orden deliberado: tipo MIME -> tamaño -> bytes mágicos -> dimensiones.
 * El tamaño se valida ANTES de leer bytes mágicos/dimensiones para nunca
 * gastar trabajo de parseo en un archivo que de todas formas se va a
 * rechazar por peso.
 */
export function validateObjectUpload(
  body: Buffer,
  declaredContentType: string,
  limits: ObjectUploadLimits,
): ValidatedObject {
  if (!isAllowedMimeType(declaredContentType)) {
    throw new ObjectValidationError(`Tipo MIME no permitido: "${declaredContentType}".`);
  }

  if (body.length === 0) {
    throw new ObjectValidationError('El archivo está vacío.');
  }
  if (body.length > limits.maxSizeBytes) {
    throw new ObjectValidationError(`El archivo excede el límite de tamaño (${limits.maxSizeBytes} bytes).`);
  }

  if (!MAGIC_BYTES[declaredContentType](body)) {
    throw new ObjectValidationError('El contenido del archivo no coincide con el tipo MIME declarado.');
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(body);
  } catch {
    throw new ObjectValidationError('No se pudieron leer las dimensiones de la imagen.');
  }
  if (!dimensions.width || !dimensions.height) {
    throw new ObjectValidationError('No se pudieron leer las dimensiones de la imagen.');
  }
  if (dimensions.width > limits.maxWidthPx || dimensions.height > limits.maxHeightPx) {
    throw new ObjectValidationError(
      `La imagen excede las dimensiones máximas permitidas (${limits.maxWidthPx}x${limits.maxHeightPx}px).`,
    );
  }

  const sha256 = createHash('sha256').update(body).digest('hex');

  return {
    sha256,
    sizeBytes: body.length,
    contentType: declaredContentType,
    width: dimensions.width,
    height: dimensions.height,
  };
}
