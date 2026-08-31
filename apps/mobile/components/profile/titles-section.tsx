import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ListTitlesResponse } from '@axioma/contracts';
import { listTitles, equipTitle } from '../../lib/api/titles';
import { describeUnlockRequirements } from '../../lib/personalization/unlock-requirement-copy';
import { LoadingState } from '../loading-state';
import { ErrorState } from '../error-state';
import { Text, Card, Chip, Icon } from '../ui';
import { useThemedStyles, radii, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

type SectionState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ListTitlesResponse };

/**
 * LEF Bloque V, Incremento 6/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §14) --
 * selector de títulos: obtenidos (equipables) + bloqueados (con requisito
 * real, no equipables). Sin equipamiento optimista, bloqueo de doble toque
 * mientras un `PATCH` está en curso, reconciliación completa ante 404.
 *
 * PROFILE-PERSONALIZATION-REMODEL (2026-08-30) -- la lógica (fetch + estado +
 * equip) se extrae a `useTitlesController`, mismo patrón que
 * `useCosmeticsController` (`cosmetics-section.tsx`), para que la pantalla
 * de Personalización pueda instanciarla UNA sola vez y compartir el título
 * equipado con la vista previa de identidad sin un segundo `listTitles()`.
 * `TitlesSection` pasa a ser presentación pura del catálogo, consumiendo un
 * controlador ya resuelto. Ninguna regla de negocio cambió; se retiró la
 * etiqueta `rarityClass` (V1 no tiene rareza como mecánica de producto).
 */
export function useTitlesController() {
  const [state, setState] = useState<SectionState>({ status: 'loading' });
  const [equipping, setEquipping] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listTitles();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setEquipError(null);
    setState({ status: 'ready', data: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleEquip(accountTitleId: string | null) {
    // Protección contra doble toque -- un PATCH ya en curso bloquea otra selección.
    if (equipping) return;
    setEquipping(true);
    setEquipError(null);

    const outcome = await equipTitle(accountTitleId);
    setEquipping(false);

    if (outcome.kind === 'ok') {
      // Actualización local con la respuesta REAL del servidor -- nunca antes de recibirla.
      const equipped = outcome.data;
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, equipped } } : prev));
      return;
    }
    if (outcome.kind === 'reload') {
      await load();
      return;
    }
    setEquipError(outcome.message);
  }

  return { state, equipping, equipError, load, handleEquip };
}

export type TitlesController = ReturnType<typeof useTitlesController>;

/**
 * Presentación pura del catálogo de títulos -- "Tu colección" (equipables) y
 * "Por desbloquear" (bloqueados, solo lectura con requisito real). El bloque
 * bloqueado es SIEMPRE el último render y nunca lleva `Pressable`/`onPress`.
 */
export function TitlesSection({ controller }: { controller: TitlesController }) {
  const styles = useThemedStyles(createStyles);
  const { state, equipping, equipError, load, handleEquip } = controller;

  if (state.status === 'loading') return <LoadingState message="Cargando títulos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { owned, equipped, locked } = state.data;

  return (
    <View style={styles.container}>
      <Text variant="caption" weight="bold" color="secondary" style={styles.sectionLabel}>
        TU COLECCIÓN
      </Text>

      {equipError ? (
        <Text variant="bodySmall" color="error">
          {equipError}
        </Text>
      ) : null}

      <View style={styles.optionsList}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar título equipado"
          accessibilityState={{ selected: equipped === null }}
          onPress={() => handleEquip(null)}
          disabled={equipping || equipped === null}
          style={[styles.optionRow, equipped === null && styles.optionRowActive]}
        >
          <Text variant="body" weight="semibold">
            Sin título
          </Text>
          {equipping ? (
            <ActivityIndicator size="small" />
          ) : equipped === null ? (
            <View style={styles.equippedBadge}>
              <Icon name="check" size={13} color="onAccent" />
              <Text variant="caption" weight="bold" style={styles.equippedBadgeText}>
                Equipado
              </Text>
            </View>
          ) : null}
        </Pressable>

        {owned.length === 0 ? (
          <Text variant="bodySmall" color="muted" style={styles.emptyMessage}>
            Todavía no posees ningún título.
          </Text>
        ) : (
          owned.map((item) => {
            const isEquipped = equipped?.accountTitleId === item.accountTitleId;
            return (
              <Pressable
                key={item.accountTitleId}
                accessibilityRole="button"
                accessibilityLabel={`Equipar título ${item.displayText}`}
                accessibilityState={{ selected: isEquipped }}
                onPress={() => handleEquip(item.accountTitleId)}
                disabled={equipping || isEquipped}
                style={[styles.optionRow, isEquipped && styles.optionRowActive]}
              >
                <View style={styles.optionText}>
                  <Text variant="body" weight="semibold" numberOfLines={2}>
                    {item.displayText}
                  </Text>
                  {item.description ? (
                    <Text variant="caption" color="secondary" numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {isEquipped ? (
                  <View style={styles.equippedBadge}>
                    <Icon name="check" size={13} color="onAccent" />
                    <Text variant="caption" weight="bold" style={styles.equippedBadgeText}>
                      Equipado
                    </Text>
                  </View>
                ) : (
                  <Chip label="Equipar" variant="neutral" />
                )}
              </Pressable>
            );
          })
        )}
      </View>

      {locked.length > 0 ? (
        <View style={styles.lockedSection}>
          <Text variant="caption" weight="bold" color="secondary" style={styles.sectionLabel}>
            POR DESBLOQUEAR
          </Text>
          {locked.map((item) => (
            <Card key={item.titleDefinitionId} variant="subtle" style={styles.lockedRow}>
              <View style={styles.lockedIcon}>
                <Icon name="lock" size={14} color="muted" />
              </View>
              <View style={styles.lockedText}>
                <Text variant="bodySmall" weight="semibold" color="secondary" numberOfLines={2}>
                  {item.displayText}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={2}>
                  {describeUnlockRequirements(item.unlockRequirements)}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: spacing.space2 },
    sectionLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    optionsList: { gap: spacing.space2 },
    emptyMessage: { paddingVertical: spacing.space2 },
    optionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: radii.medium,
      paddingVertical: spacing.space3,
      paddingHorizontal: spacing.space4,
    },
    optionRowActive: { borderColor: t.color.accent.default, backgroundColor: t.color.accent.subtleBg },
    optionText: { flex: 1, gap: 2 },
    equippedBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: t.color.accent.default,
      borderRadius: radii.full,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    equippedBadgeText: { color: t.color.text.onAccent },
    lockedSection: { gap: spacing.space2, marginTop: spacing.space2, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: t.color.border.default },
    lockedRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    lockedIcon: {
      width: 28,
      height: 28,
      borderRadius: radii.small,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.color.background.default,
    },
    lockedText: { flex: 1, gap: 2 },
  };
}
