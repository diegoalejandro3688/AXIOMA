import { crc32, deflateSync } from 'node:zlib';

/**
 * Construye un PNG real (firma + IHDR/IDAT/IEND con CRC correcto), no un
 * archivo simulado -- ver docs/adr/0010-almacenamiento-de-contenido.md.
 * Usado únicamente por el endpoint de diagnóstico
 * (platform/observability/diagnostics.controller.ts) para probar el
 * roundtrip de object storage de forma completamente autocontenida, sin
 * depender de ningún archivo externo.
 *
 * Cuando `width`/`height` son pequeños, genera datos de píxel reales
 * (deflate de una imagen blanca trivial). Para fixtures que solo necesitan
 * declarar dimensiones grandes (ej. probar el rechazo por límite máximo),
 * el IDAT queda vacío -- `image-size` solo lee el IHDR, no valida que el
 * IDAT sea consistente con el tamaño declarado.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcValue = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcValue, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

export function buildPngFixture(options: { width: number; height: number; realPixelData?: boolean }): Buffer {
  const { width, height } = options;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 2; // tipo de color: RGB
  ihdr[10] = 0; // compresión
  ihdr[11] = 0; // filtro
  ihdr[12] = 0; // entrelazado

  const wantsRealPixels = options.realPixelData !== false && width * height <= 64;
  let idatData: Buffer;
  if (wantsRealPixels) {
    const bytesPerPixel = 3;
    const stride = 1 + width * bytesPerPixel; // +1 byte de filtro por fila
    const raw = Buffer.alloc(stride * height, 0xff);
    for (let y = 0; y < height; y++) raw[y * stride] = 0; // filtro "none"
    idatData = deflateSync(raw);
  } else {
    idatData = deflateSync(Buffer.alloc(0));
  }

  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', idatData), pngChunk('IEND', Buffer.alloc(0))]);
}
