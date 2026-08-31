import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import type { CosmeticSlotValue, LockedCosmetic, OwnedCosmetic } from '@axioma/contracts';
import { groupOwnedCosmetics, groupLockedCosmetics } from '../../lib/cosmetics/group-cosmetics';
import { describeUnlockRequirements } from '../../lib/personalization/unlock-requirement-copy';
import type { CosmeticsController } from '../cosmetics-section';
import { Text, Avatar, Icon } from '../ui';
import { useThemedStyles, radii, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * PROFILE-PERSONALIZATION-REMODEL (2026-08-30) -- presentación visual del
 * catálogo de un slot de cosméticos (Avatar / Marco / Banner). Solo
 * presentación: consume el `CosmeticsController` ya resuelto y su
 * `handleSelect` (equipamiento NO optimista, bloqueo por slot, 404/409
 * intactos). Sin `rarityClass` en ninguna parte (V1 no tiene rareza como
 * mecánica de producto).
 *
 * - AVATAR / AVATAR_FRAME -> grid de 2 columnas.
 * - PROFILE_BANNER -> lista vertical de tarjetas anchas (miniatura 3:1).
 *
 * "Tu colección" (equipables) y "Por desbloquear" (bloqueados) son secciones
 * separadas. Los bloqueados son SIEMPRE solo lectura -- `LockedCosmeticCollection`
 * nunca renderiza `Pressable`/`onPress` y siempre muestra el requisito real
 * (`describeUnlockRequirements`).
 */

type VisualSlot = Extract<CosmeticSlotValue, 'AVATAR' | 'AVATAR_FRAME' | 'PROFILE_BANNER'>;

const EMPTY_COPY: Record<VisualSlot, string> = {
  AVATAR: 'Todavía no tienes avatares en tu colección.',
  AVATAR_FRAME: 'Todavía no tienes marcos. Sube de nivel y de liga para desbloquearlos.',
  PROFILE_BANNER: 'Todavía no tienes banners. Sube de nivel para desbloquearlos.',
};

export function CosmeticCollectionTab({
  slot,
  controller,
  sampleAvatarUri,
}: {
  slot: VisualSlot;
  controller: CosmeticsController;
  sampleAvatarUri: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const { state, equippingSlot, slotErrors, handleSelect } = controller;
  if (state.status !== 'ready') return null;

  const owned = groupOwnedCosmetics(state.data.owned)[slot];
  const locked = groupLockedCosmetics(state.data.locked)[slot];
  const equipped = state.data.equipped[slot];
  const isBusy = equippingSlot === slot;

  return (
    <View style={styles.tab}>
      {slotErrors[slot] ? (
        <Text variant="bodySmall" color="error">
          {slotErrors[slot]}
        </Text>
      ) : null}

      <Text variant="caption" weight="bold" color="secondary" style={styles.sectionLabel}>
        TU COLECCIÓN
      </Text>

      {owned.length === 0 ? (
        <Text variant="bodySmall" color="muted" style={styles.emptyCopy}>
          {EMPTY_COPY[slot]}
        </Text>
      ) : (
        <View style={slot === 'PROFILE_BANNER' ? styles.bannerList : styles.grid}>
          {owned.map((item) => {
            const isEquipped = equipped?.inventoryItemId === item.inventoryItemId;
            return (
              <OwnedCosmeticCard
                key={item.inventoryItemId}
                slot={slot}
                item={item}
                sampleAvatarUri={sampleAvatarUri}
                isEquipped={isEquipped}
                isEquipping={isBusy && !isEquipped}
                disabled={isBusy || isEquipped}
                onPress={() => handleSelect(slot, item)}
              />
            );
          })}
        </View>
      )}

      {locked.length > 0 ? (
        <LockedCosmeticCollection slot={slot} items={locked} sampleAvatarUri={sampleAvatarUri} />
      ) : null}
    </View>
  );
}

function OwnedCosmeticCard({
  slot,
  item,
  sampleAvatarUri,
  isEquipped,
  isEquipping,
  disabled,
  onPress,
}: {
  slot: VisualSlot;
  item: OwnedCosmetic;
  sampleAvatarUri: string | null;
  isEquipped: boolean;
  isEquipping: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const isBanner = slot === 'PROFILE_BANNER';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isEquipped, disabled }}
      accessibilityLabel={isEquipped ? `${item.name}, equipado` : `Equipar ${item.name}`}
      onPress={onPress}
      disabled={disabled}
      style={[
        isBanner ? styles.bannerCard : styles.gridCard,
        isEquipped && styles.cardEquipped,
      ]}
    >
      <View style={isBanner ? styles.bannerArtWrap : styles.gridArtWrap}>
        <CosmeticArt slot={slot} assetReference={item.assetReference} name={item.name} sampleAvatarUri={sampleAvatarUri} />
        {isEquipping ? (
          <View style={styles.artOverlay}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
      <View style={styles.cardFooter}>
        <Text variant="bodySmall" weight="semibold" numberOfLines={2} style={styles.cardName}>
          {item.name}
        </Text>
        {isEquipped ? <EquippedBadge /> : null}
      </View>
    </Pressable>
  );
}

export function LockedCosmeticCollection({
  slot,
  items,
  sampleAvatarUri,
}: {
  slot: VisualSlot;
  items: LockedCosmetic[];
  sampleAvatarUri: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const isBanner = slot === 'PROFILE_BANNER';

  return (
    <View style={styles.lockedSection}>
      <Text variant="caption" weight="bold" color="secondary" style={styles.sectionLabel}>
        POR DESBLOQUEAR
      </Text>
      <View style={isBanner ? styles.bannerList : styles.grid}>
        {items.map((item) => (
          <View
            key={item.cosmeticItemId}
            accessibilityLabel={`${item.name}, bloqueado. ${describeUnlockRequirements(item.unlockRequirements)}`}
            style={isBanner ? styles.bannerCard : styles.gridCard}
          >
            <View style={isBanner ? styles.bannerArtWrap : styles.gridArtWrap}>
              <View style={styles.lockedArt}>
                <CosmeticArt slot={slot} assetReference={item.assetReference} name={item.name} sampleAvatarUri={sampleAvatarUri} />
              </View>
              <View style={styles.lockBadge}>
                <Icon name="lock" size={13} color="onInverse" />
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.lockedTextWrap}>
                <Text variant="bodySmall" weight="semibold" color="secondary" numberOfLines={2} style={styles.cardName}>
                  {item.name}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={2}>
                  {describeUnlockRequirements(item.unlockRequirements)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Arte del cosmético según su slot -- avatar circular, marco sobre avatar de muestra, o banner 3:1. */
function CosmeticArt({
  slot,
  assetReference,
  name,
  sampleAvatarUri,
}: {
  slot: VisualSlot;
  assetReference: string;
  name: string;
  sampleAvatarUri: string | null;
}) {
  const styles = useThemedStyles(createStyles);

  if (slot === 'PROFILE_BANNER') {
    return <Image source={{ uri: assetReference }} style={styles.bannerImage} resizeMode="cover" accessibilityLabel={`Banner ${name}`} />;
  }
  if (slot === 'AVATAR_FRAME') {
    return <Avatar avatarUri={sampleAvatarUri} frameUri={assetReference} size="large" accessibilityLabel={`Marco ${name}`} />;
  }
  return <Image source={{ uri: assetReference }} style={styles.avatarImage} resizeMode="cover" accessibilityLabel={`Avatar ${name}`} />;
}

function EquippedBadge() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.equippedBadge}>
      <Icon name="check" size={12} color="onAccent" />
      <Text variant="caption" weight="bold" style={styles.equippedBadgeText}>
        Equipado
      </Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    tab: { gap: spacing.space3 },
    sectionLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    emptyCopy: { paddingVertical: spacing.space2 },

    grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.space3 },
    gridCard: {
      width: '47%' as const,
      flexGrow: 1,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: radii.large,
      padding: spacing.space3,
      gap: spacing.space2,
      alignItems: 'center' as const,
    },
    gridArtWrap: { width: 88, height: 88, alignItems: 'center' as const, justifyContent: 'center' as const },
    avatarImage: { width: 88, height: 88, borderRadius: 44, backgroundColor: t.color.background.default },

    bannerList: { gap: spacing.space3 },
    bannerCard: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: radii.large,
      padding: spacing.space3,
      gap: spacing.space2,
    },
    bannerArtWrap: { width: '100%' as const, aspectRatio: 3, borderRadius: radii.medium, overflow: 'hidden' as const, backgroundColor: t.color.background.default },
    bannerImage: { width: '100%' as const, height: '100%' as const },

    cardEquipped: { borderColor: t.color.accent.default, borderWidth: 2 },
    cardFooter: { width: '100%' as const, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    cardName: { flexShrink: 1 },

    artOverlay: {
      ...StyleSheetAbsoluteFill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.color.background.surface + 'CC',
      borderRadius: radii.medium,
    },

    equippedBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 3,
      backgroundColor: t.color.accent.default,
      borderRadius: radii.full,
      paddingVertical: 2,
      paddingHorizontal: 7,
    },
    equippedBadgeText: { color: t.color.text.onAccent },

    lockedSection: { gap: spacing.space3, marginTop: spacing.space2, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: t.color.border.default },
    lockedArt: { opacity: 0.5 },
    lockedTextWrap: { flex: 1, gap: 2 },
    lockBadge: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.color.background.inverse,
    },
  };
}

const StyleSheetAbsoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
