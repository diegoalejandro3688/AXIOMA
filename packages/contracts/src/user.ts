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

/**
 * Equipamiento de títulos -- ver docs/adr/BLOCK-III-DEFINITION.md
 * (Incremento 3, sub-incremento 3.b). `accountTitleId: null` es una
 * acción explícita ("quitar el título equipado"), distinta de omitir el
 * campo -- por eso `nullable()`, no `optional()`.
 */
export const equipTitleRequestSchema = z.object({ accountTitleId: entityId.nullable() });
export type EquipTitleRequest = z.infer<typeof equipTitleRequestSchema>;

export const equippedTitleResponseSchema = z.object({
  accountTitleId: entityId,
  titleDefinitionId: entityId,
  titleKey: z.string(),
  displayText: z.string(),
  rarityClass: z.string(),
  equippedAt: isoDateTime,
});
export type EquippedTitleResponse = z.infer<typeof equippedTitleResponseSchema>;

/**
 * Equipamiento de cosméticos -- ver docs/adr/BLOCK-III-DEFINITION.md
 * (Incremento 5, sub-incremento 5.b). `cosmeticSlot` -- mismo enum que
 * `CosmeticSlot` del backend (§4.15); `TITLE` deliberadamente ausente
 * (Gate 35, los títulos usan `equipTitleRequestSchema`, no este contrato).
 * Sin desequipamiento sin reemplazo en 5.b -- `PUT` siempre exige un
 * `inventoryItemId` (identidad estable del recurso "cosmético equipado en
 * este slot"), nunca `null`.
 */
export const cosmeticSlotSchema = z.enum(['AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE']);
export type CosmeticSlotValue = z.infer<typeof cosmeticSlotSchema>;

const cosmeticItemInfoSchema = z.object({
  inventoryItemId: entityId,
  cosmeticItemId: entityId,
  itemKey: z.string(),
  itemType: cosmeticSlotSchema,
  name: z.string(),
  description: z.string().nullable(),
  rarityClass: z.string(),
  assetReference: z.string(),
});

export const ownedCosmeticSchema = cosmeticItemInfoSchema.extend({ acquiredAt: isoDateTime });
export type OwnedCosmetic = z.infer<typeof ownedCosmeticSchema>;

export const cosmeticSummarySchema = cosmeticItemInfoSchema.extend({ equippedAt: isoDateTime });
export type CosmeticSummary = z.infer<typeof cosmeticSummarySchema>;

export const listCosmeticsResponseSchema = z.object({
  owned: z.array(ownedCosmeticSchema),
  equipped: z.object({
    AVATAR: cosmeticSummarySchema.nullable(),
    AVATAR_FRAME: cosmeticSummarySchema.nullable(),
    PROFILE_BANNER: cosmeticSummarySchema.nullable(),
    BADGE: cosmeticSummarySchema.nullable(),
  }),
});
export type ListCosmeticsResponse = z.infer<typeof listCosmeticsResponseSchema>;

export const equipCosmeticRequestSchema = z.object({ inventoryItemId: entityId });
export type EquipCosmeticRequest = z.infer<typeof equipCosmeticRequestSchema>;

export const equipCosmeticResponseSchema = cosmeticSummarySchema;
export type EquipCosmeticResponse = z.infer<typeof equipCosmeticResponseSchema>;

/**
 * Perfil competitivo de otro usuario -- ver docs/adr/0021-perfil-competitivo-cross-cuenta.md.
 * Deliberadamente SIN ningún identificador interno (`accountId`,
 * `publicProfileId`, `seasonLeagueParticipationId`, `groupId`,
 * `inventoryItemId`/`cosmeticItemId`, `titleDefinitionId`) -- lista
 * blanca de solo datos de producto (ADR-0021 §2/§3, precisión del
 * Product Owner 2026-08-06: "ninguna respuesta expone IDs internos
 * correlacionables").
 */
export const competitiveEquippedTitleSchema = z.object({
  titleKey: z.string(),
  displayText: z.string(),
  rarityClass: z.string(),
});
export type CompetitiveEquippedTitle = z.infer<typeof competitiveEquippedTitleSchema>;

export const competitiveEquippedCosmeticSchema = z.object({
  cosmeticSlot: cosmeticSlotSchema,
  itemKey: z.string(),
  name: z.string(),
  assetReference: z.string(),
});
export type CompetitiveEquippedCosmetic = z.infer<typeof competitiveEquippedCosmeticSchema>;

export const publicAchievementSchema = z.object({
  achievementKey: z.string(),
  name: z.string(),
  unlockedAt: isoDateTime,
});
export type PublicAchievement = z.infer<typeof publicAchievementSchema>;

/**
 * Insignias destacadas -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md §10 (LEF
 * Bloque V, Incremento 2). Máximo 3, mínimo 0 (decisión cerrada del
 * Product Owner, §4.6) -- poseer una insignia y destacarla son conceptos
 * distintos.
 *
 * `featuredAchievementSchema` es la forma PRIVADA (autoservicio, `GET`/
 * `PUT .../featured-achievements`) -- expone `achievementUnlockId`
 * (necesario para que el propio dueño pueda referenciar cuál es cuál al
 * reordenar/quitar); nunca se usa en una superficie pública.
 */
export const featuredAchievementSchema = z.object({
  achievementUnlockId: entityId,
  achievementKey: z.string(),
  name: z.string(),
  unlockedAt: isoDateTime,
  displayOrder: z.number().int().nonnegative(),
});
export type FeaturedAchievement = z.infer<typeof featuredAchievementSchema>;

export const featuredAchievementsResponseSchema = z.object({ featured: z.array(featuredAchievementSchema) });
export type FeaturedAchievementsResponse = z.infer<typeof featuredAchievementsResponseSchema>;

/**
 * `achievementUnlockIds` es la selección COMPLETA deseada (reemplazo
 * atómico, nunca una adición incremental) -- 0 a 3 elementos, sin
 * duplicados. El duplicado se rechaza explícitamente aquí, en la frontera
 * de entrada (ADR-0007) -- nunca se deduplica en silencio.
 */
export const setFeaturedAchievementsRequestSchema = z.object({
  achievementUnlockIds: z
    .array(entityId)
    .max(3, 'No se pueden destacar más de 3 insignias.')
    .refine((ids) => new Set(ids).size === ids.length, { message: 'La selección no puede contener la misma insignia repetida.' }),
});
export type SetFeaturedAchievementsRequest = z.infer<typeof setFeaturedAchievementsRequestSchema>;

/** `null` si la cuenta no tiene participación activa en la temporada vigente -- NUNCA motivo de 404 (ADR-0021 §2). */
export const competitiveContextSchema = z.object({
  leagueName: z.string(),
  rankPosition: z.number().int().positive(),
  metricValue: z.number().int(),
  calculatedAt: isoDateTime,
  snapshotVersion: z.number().int().nonnegative(),
});
export type CompetitiveContext = z.infer<typeof competitiveContextSchema>;

export const competitiveProfileResponseSchema = z.object({
  username: z.string(),
  avatar: z.string().nullable(),
  /** LEF Bloque V, Incremento 1 (enmienda ADR-0021 §2) -- banner YA equipado (slot PROFILE_BANNER, Bloque III). `null` = sin banner equipado, campo vacío legítimo, no redacción. */
  banner: z.string().nullable(),
  equippedTitle: competitiveEquippedTitleSchema.nullable(),
  equippedCosmetics: z.array(competitiveEquippedCosmeticSchema),
  levelNumber: z.number().int().positive(),
  publicAchievements: z.array(publicAchievementSchema),
  /** LEF Bloque V, Incremento 2 (docs/adr/LEF-BLOCK-V-DEFINITION.md §10) -- subconjunto curado (0-3) de `publicAchievements` que la cuenta decidió destacar. Nunca contiene un logro ausente de `publicAchievements`. */
  featuredAchievements: z.array(publicAchievementSchema).max(3),
  competitive: competitiveContextSchema.nullable(),
});
export type CompetitiveProfileResponse = z.infer<typeof competitiveProfileResponseSchema>;

/** `/me` únicamente -- añade `lifecycleStatus` propio (ADR-0021, precisión 2026-08-06: RETIRED se muestra al dueño, nunca a un tercero). */
export const meCompetitiveProfileResponseSchema = competitiveProfileResponseSchema.extend({
  lifecycleStatus: z.enum(['ACTIVE', 'RETIRED']),
});
export type MeCompetitiveProfileResponse = z.infer<typeof meCompetitiveProfileResponseSchema>;

/**
 * Lista de ranking del propio grupo -- ver docs/adr/0021-perfil-competitivo-cross-cuenta.md,
 * sub-incremento 3.c. Unión discriminada por `presentable`: una fila
 * redactada contiene ÚNICAMENTE `presentable: false`, `isCurrentUser`,
 * `rankPosition`, `metricValue` -- ninguna otra clave, ni con valor
 * `null` (mismo criterio que la redacción de perfil individual). Nunca
 * incluye `accountId`/`publicProfileId`/`seasonLeagueParticipationId`/
 * `groupId` -- ni una fila presentable ni una redactada.
 */
export const leaderboardRowSchema = z.discriminatedUnion('presentable', [
  z.object({
    presentable: z.literal(true),
    isCurrentUser: z.boolean(),
    rankPosition: z.number().int().positive(),
    metricValue: z.number().int(),
    username: z.string(),
    avatar: z.string().nullable(),
    banner: z.string().nullable(),
    equippedTitle: competitiveEquippedTitleSchema.nullable(),
    equippedCosmetics: z.array(competitiveEquippedCosmeticSchema),
    levelNumber: z.number().int().positive(),
    publicAchievements: z.array(publicAchievementSchema),
    featuredAchievements: z.array(publicAchievementSchema).max(3),
  }),
  z.object({
    presentable: z.literal(false),
    isCurrentUser: z.boolean(),
    rankPosition: z.number().int().positive(),
    metricValue: z.number().int(),
  }),
]);
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

/**
 * `nextCursor` es OPAQUE -- ver `leaderboard-cursor.ts` (backend). Nunca
 * decodificar ni interpretar del lado del cliente; pasar tal cual como
 * `?cursor=` de la siguiente página. `null` significa que no hay más
 * páginas. `competitiveContext: null` cuando el solicitante no tiene
 * participación activa -- lista vacía, NUNCA un error (ADR-0021 §2).
 */
export const leaderboardPageResponseSchema = z.object({
  entries: z.array(leaderboardRowSchema),
  nextCursor: z.string().nullable(),
  competitiveContext: competitiveContextSchema.nullable(),
});
export type LeaderboardPageResponse = z.infer<typeof leaderboardPageResponseSchema>;
