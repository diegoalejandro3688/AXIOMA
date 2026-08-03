import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos del dominio USER -- ver docs/adr/0008-gestion-usuarios-perfil-basico.md
 * (perfil privado, equivalente reducido de `student_profile`, Data Model
 * Bloque 6.3) y docs/adr/0018-public-profile-foundation.md (identidad
 * pública, `public_profile`, Bloque 6.5 -- incremento "Public Profile
 * Foundation", Bloque II de Learning Experience Foundation).
 */

/** Default de PRODUCTO (Chile/PAES) -- NO es una inferencia del dispositivo/usuario. Ver ADR-0008. */
export const DEFAULT_USER_TIMEZONE = 'America/Santiago';

function containsControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const isC0 = code <= 0x1f;
    const isDel = code === 0x7f;
    const isLineOrParagraphSeparator = code === 0x2028 || code === 0x2029;
    if (isC0 || isDel || isLineOrParagraphSeparator) return true;
  }
  return false;
}

/**
 * Se normaliza a NFC ANTES de validar longitud/espacios -- así lo que se
 * valida es exactamente lo que se guarda, sin importar la forma Unicode
 * (NFC/NFD) en la que el cliente haya enviado el texto. Permite Unicode
 * normal (tildes, ñ, etc.); rechaza caracteres de control y espacios al
 * inicio/final. Deliberadamente NO incluye moderación de contenido --
 * queda fuera de alcance del Paso 8 (ver ADR-0008).
 */
export const displayNameSchema = z
  .string()
  .transform((value) => value.normalize('NFC'))
  .refine((value) => value.length >= 2 && value.length <= 40, {
    message: 'El nombre debe tener entre 2 y 40 caracteres.',
  })
  .refine((value) => value === value.trim(), {
    message: 'El nombre no puede tener espacios al inicio o al final.',
  })
  .refine((value) => !containsControlCharacter(value), {
    message: 'El nombre contiene caracteres no permitidos.',
  });

function isValidIanaTimezone(value: string): boolean {
  try {
    return Intl.supportedValuesOf('timeZone').includes(value);
  } catch {
    return false;
  }
}

export const timezoneSchema = z
  .string()
  .refine(isValidIanaTimezone, { message: 'Zona horaria no reconocida.' });

export const initializeUserProfileRequestSchema = z.object({
  displayName: displayNameSchema,
  timezone: timezoneSchema.optional(),
});

export const updateUserProfileRequestSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.timezone !== undefined, {
    message: 'Debe incluir al menos un campo para actualizar.',
  });

export const userProfileResponseSchema = z.object({
  accountId: entityId,
  displayName: z.string(),
  timezone: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type InitializeUserProfileRequest = z.infer<typeof initializeUserProfileRequestSchema>;
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileRequestSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

/**
 * `public_profile` -- ver docs/adr/0018-public-profile-foundation.md.
 *
 * Forma canónica ÚNICA: sin `usernameOriginal` con casing propio (decisión
 * explícita del Product Owner, ADR-0018 §2) -- se valida longitud/charset
 * sobre el valor tal cual lo escribe el estudiante, pero lo que se
 * persiste y se devuelve SIEMPRE es NFC + minúsculas. El charset excluye
 * Unicode deliberadamente (riesgo de homoglifos frente al requisito de
 * validar contra suplantación, Data Model §6.6).
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export const usernameInputSchema = z
  .string()
  .refine((value) => USERNAME_PATTERN.test(value), {
    message: 'El nombre de usuario debe tener 3-20 caracteres: letras, números o guion bajo, sin acentos ni espacios.',
  })
  .transform((value) => value.normalize('NFC').toLowerCase());
export type UsernameInput = z.infer<typeof usernameInputSchema>;

export const claimPublicProfileRequestSchema = z.object({ username: usernameInputSchema });
export type ClaimPublicProfileRequest = z.infer<typeof claimPublicProfileRequestSchema>;

export const changePublicUsernameRequestSchema = z.object({ username: usernameInputSchema });
export type ChangePublicUsernameRequest = z.infer<typeof changePublicUsernameRequestSchema>;

export const setPublicProfileVisibilityRequestSchema = z.object({ visible: z.boolean() });
export type SetPublicProfileVisibilityRequest = z.infer<typeof setPublicProfileVisibilityRequestSchema>;

export const publicProfileVisibilityStatusSchema = z.enum(['PRIVATE', 'VISIBLE']);
export const publicProfileLifecycleStatusSchema = z.enum(['ACTIVE', 'RETIRED', 'ANONYMIZED']);

export const publicProfileResponseSchema = z.object({
  accountId: entityId,
  username: z.string(),
  visibilityStatus: publicProfileVisibilityStatusSchema,
  lifecycleStatus: publicProfileLifecycleStatusSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type PublicProfileResponse = z.infer<typeof publicProfileResponseSchema>;
