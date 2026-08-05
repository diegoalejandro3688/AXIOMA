import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { CosmeticSlotValue, ListCosmeticsResponse, OwnedCosmetic } from '@axioma/contracts';
import { listCosmetics, equipCosmetic } from '../lib/api/cosmetics';
import { COSMETIC_SLOTS, SLOT_LABEL, groupOwnedCosmetics } from '../lib/cosmetics/group-cosmetics';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ListCosmeticsResponse };

/**
 * Sección "Personalización" dentro de Perfil -- Incremento 5, sub-incremento
 * 5.c (ver docs/adr/BLOCK-III-DEFINITION.md §4.21). Consume el backend ya
 * cerrado (5.b): `GET`/`PUT /gamification/me/cosmetics[...]`. Sin equipamiento
 * optimista -- el estado local de un slot solo cambia con la respuesta
 * confirmada del `PUT` (`outcome.data`), nunca antes.
 *
 * Bloqueo de doble toque a nivel de SLOT (no global): dos `PUT` a slots
 * distintos pueden coexistir en el backend (Gate 5.b concurrente por slot),
 * así que esta pantalla solo bloquea el slot que tiene un `PUT` en curso,
 * no los otros tres.
 */
export function CosmeticsSection() {
  const styles = useThemedStyles(createStyles);
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
      return;
    }

    if (outcome.kind === 'reload') {
      // 404 -- perfil inexistente o inventario desactualizado: reconciliar recargando todo, no adivinar.
      await load();
      return;
    }

    // 409 (conflicto: ya no disponible o slot equivocado) o error de red/servidor -- conservar el equipamiento anterior.
    setSlotErrors((prev) => ({ ...prev, [slot]: outcome.message }));
  }

  if (state.status === 'loading') return <LoadingState message="Cargando personalización…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const grouped = groupOwnedCosmetics(state.data.owned);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Personalización
      </Text>

      {COSMETIC_SLOTS.map((slot) => {
        const equippedItem = state.data.equipped[slot];
        const ownedForSlot = grouped[slot];
        const isExpanded = expandedSlot === slot;
        const isEquipping = equippingSlot === slot;

        return (
          <View key={slot} style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${SLOT_LABEL[slot]} -- ${equippedItem ? equippedItem.name : 'sin equipar'}`}
              onPress={() => toggleSlot(slot)}
              disabled={equippingSlot !== null}
              style={styles.slotHeader}
            >
              <View style={styles.slotPreview}>
                {equippedItem ? (
                  <Image source={{ uri: equippedItem.assetReference }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.previewPlaceholder} />
                )}
              </View>
              <View style={styles.slotInfo}>
                <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
                <Text style={styles.slotEquipped}>{equippedItem ? equippedItem.name : 'Sin equipar'}</Text>
              </View>
              {isEquipping ? <ActivityIndicator /> : <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>}
            </Pressable>

            {slotErrors[slot] ? <Text style={styles.slotError}>{slotErrors[slot]}</Text> : null}

            {isExpanded ? (
              <View style={styles.optionsList}>
                {ownedForSlot.length === 0 ? (
                  <Text style={styles.emptySlot}>Todavía no posees cosméticos de este tipo.</Text>
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
                        <Text style={styles.optionName}>{item.name}</Text>
                        <Text style={styles.optionMeta}>{isCurrentlyEquipped ? 'Equipado' : item.rarityClass}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12, marginTop: 8 },
    title: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    card: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 12,
      gap: 8,
    },
    slotHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    slotPreview: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' as const, backgroundColor: t.color.background.default },
    previewImage: { width: 40, height: 40 },
    previewPlaceholder: { width: 40, height: 40, borderWidth: 1, borderColor: t.color.border.default, borderRadius: 8 },
    slotInfo: { flex: 1, gap: 2 },
    slotLabel: { fontSize: 13, fontWeight: '700' as const, color: t.color.text.secondary, textTransform: 'uppercase' as const },
    slotEquipped: { fontSize: 15, fontWeight: '600' as const, color: t.color.text.primary },
    chevron: { fontSize: 12, color: t.color.text.muted },
    slotError: { fontSize: 13, color: t.color.state.error.text },
    optionsList: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.color.border.default },
    emptySlot: { fontSize: 13, color: t.color.text.muted, paddingVertical: 6 },
    optionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    optionRowActive: { backgroundColor: t.color.accent.subtleBg },
    optionName: { fontSize: 14, color: t.color.text.primary, fontWeight: '600' as const },
    optionMeta: { fontSize: 12, color: t.color.text.muted },
  };
}
