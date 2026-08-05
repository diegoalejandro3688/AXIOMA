import type { OwnedCosmetic, CosmeticSlotValue } from '@axioma/contracts';

/**
 * Agrupación puramente de PRESENTACIÓN -- ver docs/adr/BLOCK-III-DEFINITION.md
 * §4.21 (Incremento 5, sub-incremento 5.c). `itemType` ya viene decidido por
 * el backend (5.a/5.b); este módulo solo particiona `owned` en los 4 slots
 * fijos, sin decidir a qué slot pertenece cada cosmético.
 */
export const COSMETIC_SLOTS: readonly CosmeticSlotValue[] = ['AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE'];

export const SLOT_LABEL: Record<CosmeticSlotValue, string> = {
  AVATAR: 'Avatar',
  AVATAR_FRAME: 'Marco de avatar',
  PROFILE_BANNER: 'Banner de perfil',
  BADGE: 'Insignia',
};

export type GroupedOwnedCosmetics = Record<CosmeticSlotValue, OwnedCosmetic[]>;

export function groupOwnedCosmetics(owned: OwnedCosmetic[]): GroupedOwnedCosmetics {
  const grouped: GroupedOwnedCosmetics = { AVATAR: [], AVATAR_FRAME: [], PROFILE_BANNER: [], BADGE: [] };
  for (const item of owned) {
    grouped[item.itemType].push(item);
  }
  return grouped;
}
