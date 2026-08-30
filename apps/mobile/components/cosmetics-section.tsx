import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import type { CosmeticSlotValue, ListCosmeticsResponse, OwnedCosmetic } from '@axioma/contracts';
import { listCosmetics, equipCosmetic } from '../lib/api/cosmetics';
import { SLOT_LABEL, groupOwnedCosmetics, groupLockedCosmetics } from '../lib/cosmetics/group-cosmetics';
import { describeUnlockRequirements } from '../lib/personalization/unlock-requirement-copy';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';
import { Text, Card, Chip, Avatar, Icon } from './ui';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ListCosmeticsResponse };

/**
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- lógica de
 * cosméticos extraída a un controlador (`useCosmeticsController`)
 * reutilizable desde MÚLTIPLES superficies de presentación (las 4 tabs de
 * `personalizacion.tsx`) sin duplicar `listCosmetics()`. Antes de este
 * refactor, `CosmeticsSection` mezclaba fetch + estado + presentación de
 * los 4 slots en un solo componente -- correcto para una lista vertical
 * única, pero montar/desmontar esa pieza por cada tab (Avatar/Banner/
 * Insignia) habría disparado un `listCosmetics()` nuevo por cada cambio de
 * pestaña. El controlador se instancia UNA sola vez en la pantalla
 * contenedora; `CosmeticSlotCard` es una presentación pura de UN slot,
 * consumiendo el estado ya resuelto -- cambiar de tab nunca reconsulta el
 * servidor.
 *
 * Ninguna regla de negocio cambió: mismo backend (`GET`/`PUT
 * /gamification/me/cosmetics[...]`), mismo criterio sin equipamiento
 * optimista, mismo bloqueo de doble toque POR SLOT (no global -- dos `PUT`
 * a slots distintos pueden coexistir, Gate 5.b), misma reconciliación
 * (`outcome.data` tras `PUT`, recarga completa ante 404).
 */
export function useCosmeticsController(onEquipped?: () => void) {
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [expandedSlot, setExpandedSlot] = useState<CosmeticSlotValue | null>(null);
  const [equippingSlot, setEquippingSlot] = useState<CosmeticSlotValue | null>(null);
  const [slotErrors, setSlotErrors] = useState<Partial<Record<CosmeticSlotValue, string>>>({});

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listCosmetics();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setSlotErrors({});
    setExpandedSlot(null);
    setState({ status: 'ready', data: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSlot(slot: CosmeticSlotValue) {
    if (equippingSlot !== null) return;
    setExpandedSlot((prev) => (prev === slot ? null : slot));
  }

  async function handleSelect(slot: CosmeticSlotValue, item: OwnedCosmetic) {
    // Protección contra doble toque -- un PUT ya en curso sobre ESTE slot bloquea otra selección en el mismo slot.
    if (equippingSlot !== null) return;

    setEquippingSlot(slot);
    setSlotErrors((prev) => {
      if (!(slot in prev)) return prev;
      const next = { ...prev };
      delete next[slot];
      return next;
    });

    const outcome = await equipCosmetic(slot, item.inventoryItemId);
    setEquippingSlot(null);

    if (outcome.kind === 'ok') {
      // Actualización local con la respuesta REAL del servidor -- nunca antes de recibirla.
      const equipped = outcome.data;
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, equipped: { ...prev.data.equipped, [slot]: equipped } } } : prev));
      setExpandedSlot(null);
      onEquipped?.();
      return;
    }

    if (outcome.kind === 'reload') {
      // 404 -- perfil inexistente o inventario desactualizado: reconciliar recargando todo, no adivinar.
      await load();
      onEquipped?.();
      return;
    }

    // 409 (conflicto: ya no disponible o slot equivocado) o error de red/servidor -- conservar el equipamiento anterior.
    setSlotErrors((prev) => ({ ...prev, [slot]: outcome.message }));
  }

  return { state, expandedSlot, equippingSlot, slotErrors, toggleSlot, handleSelect };
}

export type CosmeticsController = ReturnType<typeof useCosmeticsController>;

/**
 * Presentación pura de UN slot -- misma tarjeta/acordeón que antes vivía
 * inline en el `.map(COSMETIC_SLOTS)` de `CosmeticsSection`, ahora
 * reutilizable de forma independiente (una por tab en Personalización).
 * AVATAR y AVATAR_FRAME se renderizan como DOS instancias de este
 * componente -- mismo controlador compartido, pero cada una lee/escribe
 * ÚNICAMENTE su propia clave en `equipped`/`grouped`, sin fusionar
 * contrato ni estado entre ambas.
 */
export function CosmeticSlotCard({ slot, controller }: { slot: CosmeticSlotValue; controller: CosmeticsController }) {
  const styles = useThemedStyles(createStyles);
  const { state, expandedSlot, equippingSlot, slotErrors, toggleSlot, handleSelect } = controller;

  if (state.status === 'loading') return <LoadingState message="Cargando personalización…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={() => toggleSlot(slot)} />;

  const grouped = groupOwnedCosmetics(state.data.owned);
  const groupedLocked = groupLockedCosmetics(state.data.locked);
  const equippedItem = state.data.equipped[slot];
  const ownedForSlot = grouped[slot];
  const lockedForSlot = groupedLocked[slot];
  const isExpanded = expandedSlot === slot;
  const isEquipping = equippingSlot === slot;
  const isAvatarLikeSlot = slot === 'AVATAR' || slot === 'AVATAR_FRAME';
  // COSMETICS-V1 §21.E -- el banner NO es circular: preview rectangular con recorte `cover`.
  const isBannerSlot = slot === 'PROFILE_BANNER';

  return (
    <Card variant="outlined" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SLOT_LABEL[slot]} -- ${equippedItem ? equippedItem.name : 'sin equipar'}`}
        onPress={() => toggleSlot(slot)}
        disabled={equippingSlot !== null}
        style={styles.slotHeader}
      >
        <View style={isBannerSlot ? styles.bannerPreview : styles.slotPreview}>
          {isBannerSlot ? (
            equippedItem ? (
              <Image
                source={{ uri: equippedItem.assetReference }}
                style={styles.bannerPreviewImage}
                resizeMode="cover"
                accessibilityLabel={`Banner ${equippedItem.name}`}
              />
            ) : (
              <View style={styles.bannerPreviewPlaceholder} />
            )
          ) : isAvatarLikeSlot ? (
            <Avatar avatarUri={equippedItem?.assetReference ?? null} size="small" />
          ) : equippedItem ? (
            <Avatar avatarUri={equippedItem.assetReference} size="small" />
          ) : (
            <View style={styles.previewPlaceholder} />
          )}
        </View>
        <View style={styles.slotInfo}>
          <Text variant="caption" weight="bold" color="secondary" style={styles.slotLabel}>
            {SLOT_LABEL[slot]}
          </Text>
          <Text variant="titleMedium" weight="semibold">
            {equippedItem ? equippedItem.name : 'Sin equipar'}
          </Text>
        </View>
        {isEquipping ? <ActivityIndicator /> : <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />}
      </Pressable>

      {slotErrors[slot] ? (
        <Text variant="bodySmall" color="error">
          {slotErrors[slot]}
        </Text>
      ) : null}

      {isExpanded ? (
        <View style={styles.optionsList}>
          {ownedForSlot.length === 0 ? (
            <Text variant="bodySmall" color="muted" style={styles.emptySlot}>
              Todavía no posees cosméticos de este tipo.
            </Text>
          ) : (
            ownedForSlot.map((item) => {
              const isCurrentlyEquipped = equippedItem?.inventoryItemId === item.inventoryItemId;
              return (
                <Pressable
                  key={item.inventoryItemId}
                  accessibilityRole="button"
                  accessibilityLabel={`Equipar ${item.name}`}
                  onPress={() => handleSelect(slot, item)}
                  disabled={isEquipping || isCurrentlyEquipped}
                  style={[styles.optionRow, isCurrentlyEquipped && styles.optionRowActive]}
                >
                  <Text variant="body" weight="semibold">
                    {item.name}
                  </Text>
                  <Chip label={isCurrentlyEquipped ? 'Equipado' : item.rarityClass} variant={isCurrentlyEquipped ? 'selected' : 'neutral'} />
                </Pressable>
              );
            })
          )}

          {lockedForSlot.length > 0 ? (
            <View style={styles.lockedSection}>
              <Text variant="caption" weight="bold" color="secondary" style={styles.lockedSectionTitle}>
                Bloqueados
              </Text>
              {lockedForSlot.map((item) => (
                <Card key={item.cosmeticItemId} variant="subtle" style={styles.lockedRow}>
                  <Text variant="bodySmall" weight="semibold" color="muted">
                    {item.name}
                  </Text>
                  <Chip label={describeUnlockRequirements(item.unlockRequirements)} variant="disabled" />
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: { gap: 8 },
    slotHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    slotPreview: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' as const, backgroundColor: t.color.background.default },
    previewPlaceholder: { width: 40, height: 40, borderWidth: 1, borderColor: t.color.border.default, borderRadius: 8 },
    // COSMETICS-V1 §21.E -- preview de banner: rectángulo apaisado (~3:1), nunca círculo.
    bannerPreview: { width: 66, height: 24, borderRadius: 6, overflow: 'hidden' as const, backgroundColor: t.color.background.default },
    bannerPreviewImage: { width: '100%' as const, height: '100%' as const },
    bannerPreviewPlaceholder: { width: '100%' as const, height: '100%' as const, borderWidth: 1, borderColor: t.color.border.default, borderRadius: 6 },
    slotInfo: { flex: 1, gap: 2 },
    slotLabel: { textTransform: 'uppercase' as const },
    optionsList: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.color.border.default },
    emptySlot: { paddingVertical: 6 },
    optionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    optionRowActive: { backgroundColor: t.color.accent.subtleBg },
    lockedSection: { gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.color.border.default },
    lockedSectionTitle: { textTransform: 'uppercase' as const },
    lockedRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: 8 },
  };
}
