import { z } from 'zod';

/**
 * Identificador estándar para entidades del dominio (UUID v4 generado por el servidor).
 * Ningún cliente genera IDs de entidades autoritativas.
 */
export const entityId = z.string().uuid();

export const isoDateTime = z.string().datetime({ offset: true });
