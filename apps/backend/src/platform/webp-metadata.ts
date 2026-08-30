/**
 * COSMETICS-V1 -- lector MÍNIMO de metadatos WebP en Node puro (sin `sharp`,
 * sin `PIL`, sin binarios del sistema) -- lo usan el seed de cosméticos y su
 * gate para validar dimensiones/formato/alpha de los assets ANTES de subir
 * nada, de forma reproducible en cualquier entorno/CI.
 *
 * Soporta los tres contenedores WebP: VP8 (lossy simple), VP8L (lossless) y
 * VP8X (extendido, con o sin ALPH). No decodifica píxeles -- solo cabeceras.
 * Referencia: https://developers.google.com/speed/webp/docs/riff_container
 */

export interface WebpMetadata {
  format: 'webp';
  container: 'VP8' | 'VP8L' | 'VP8X';
  width: number;
  height: number;
  hasAlpha: boolean;
}

export function readWebpMetadata(buffer: Buffer): WebpMetadata {
  if (buffer.length < 30) throw new Error('WebP inválido: archivo demasiado corto.');
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('No es un archivo WebP (falta la firma RIFF/WEBP).');
  }
  const fourCC = buffer.toString('ascii', 12, 16);

  if (fourCC === 'VP8X') {
    const flags = buffer.readUInt8(20);
    const hasAlpha = (flags & 0x10) !== 0;
    const width = 1 + (buffer.readUInt8(24) | (buffer.readUInt8(25) << 8) | (buffer.readUInt8(26) << 16));
    const height = 1 + (buffer.readUInt8(27) | (buffer.readUInt8(28) << 8) | (buffer.readUInt8(29) << 16));
    return { format: 'webp', container: 'VP8X', width, height, hasAlpha };
  }

  if (fourCC === 'VP8L') {
    // byte 20 = 0x2f (signature); luego 14 bits width-1, 14 bits height-1, 1 bit alpha_is_used
    if (buffer.readUInt8(20) !== 0x2f) throw new Error('WebP VP8L inválido: falta la firma 0x2F.');
    const b0 = buffer.readUInt8(21);
    const b1 = buffer.readUInt8(22);
    const b2 = buffer.readUInt8(23);
    const b3 = buffer.readUInt8(24);
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    const hasAlpha = ((b3 & 0x10) >> 4) === 1;
    return { format: 'webp', container: 'VP8L', width, height, hasAlpha };
  }

  if (fourCC === 'VP8 ') {
    // frame tag (3 bytes) en 20..22; start code 0x9d 0x01 0x2a en 23..25; dims 14-bit en 26..29
    if (buffer.readUInt8(23) !== 0x9d || buffer.readUInt8(24) !== 0x01 || buffer.readUInt8(25) !== 0x2a) {
      throw new Error('WebP VP8 inválido: start code ausente.');
    }
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { format: 'webp', container: 'VP8', width, height, hasAlpha: false };
  }

  throw new Error(`Contenedor WebP no reconocido: "${fourCC}".`);
}
