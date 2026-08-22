import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ListTitlesResponse } from '@axioma/contracts';
import { listTitles, equipTitle } from '../../lib/api/titles';
import { describeUnlockRequirements } from '../../lib/personalization/unlock-requirement-copy';
import { LoadingState } from '../loading-state';
import { ErrorState } from '../error-state';
import { Text, Card, Chip, Icon } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

type SectionState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ListTitlesResponse };

/**
 * LEF Bloque V, Incremento 6/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §14) --
 * selector de títulos: obtenidos (equipables) + bloqueados (con requisito
 * real, no equipables). Mismo patrón que `CosmeticsSection` (Bloque III):
 * sin equipamiento optimista, bloqueo de doble toque mientras un `PATCH`
 * está en curso, reconciliación completa ante 404 (catálogo desactualizado).
 *
 * `locked` viene YA filtrado por el backend a elementos VISIBLES con al
 * menos un `unlockRequirement` real (§4.8/§14, decisión del Product Owner)
 * -- este componente nunca decide qué entra ahí, solo lo presenta.
 *
 * PROFILE-2 (decisión del Product Owner, 2026-08-22) -- acordeón colapsado
 * por defecto (`expanded`, NUEVO estado local), mismo patrón ya probado en
 * `CosmeticsSection` (`expandedSlot`): en colapsado solo se ve el título
 * equipado actual (o "Sin título") + affordance de expansión; al expandir,
 * aparecen owned/locked exactamente igual que antes. Reduce el crecimiento
 * de Perfil cuando la cuenta acumula muchos títulos, sin tocar contratos,
 * equipamiento, loading/error ni reconciliación.
 */
export function TitlesSection() {
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<SectionState>({ status: 'loading' });
  const [equipping, setEquipping] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  if (state.status === 'loading') return <LoadingState message="Cargando títulos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { owned, equipped, locked } = state.data;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Títulos -- ${equipped ? equipped.displayText : 'Sin título'}`}
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
      >
        <View style={styles.headerInfo}>
          <Text variant="caption" weight="bold" color="secondary" style={styles.headerLabel}>
            TÍTULOS
          </Text>
          <Text variant="titleMedium" weight="semibold">
            {equipped ? equipped.displayText : 'Sin título'}
          </Text>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />
      </Pressable>

      {equipError ? (
        <Text variant="bodySmall" color="error">
          {equipError}
        </Text>
      ) : null}

      {expanded ? (
        <View style={styles.optionsList}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar título equipado"
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
              <Chip label="Equipado" variant="selected" />
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
                  onPress={() => handleEquip(item.accountTitleId)}
                  disabled={equipping || isEquipped}
                  style={[styles.optionRow, isEquipped && styles.optionRowActive]}
                >
                  <Text variant="body" weight="semibold">
                    {item.displayText}
                  </Text>
                  <Chip label={isEquipped ? 'Equipado' : item.rarityClass} variant={isEquipped ? 'selected' : 'neutral'} />
                </Pressable>
              );
            })
          )}

          {locked.length > 0 ? (
            <View style={styles.lockedSection}>
              <Text variant="caption" weight="bold" color="secondary" style={styles.lockedTitle}>
                Bloqueados
              </Text>
              {locked.map((item) => (
                <Card key={item.titleDefinitionId} variant="subtle" style={styles.lockedRow}>
                  <Text variant="bodySmall" weight="semibold" color="muted">
                    {item.displayText}
                  </Text>
                  <Chip label={describeUnlockRequirements(item.unlockRequirements)} variant="disabled" />
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 8 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    headerInfo: { flex: 1, gap: 2 },
    headerLabel: { textTransform: 'uppercase' as const },
    optionsList: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.color.border.default },
    emptyMessage: { paddingVertical: 6 },
    optionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    optionRowActive: { backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default },
    lockedSection: { gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.color.border.default },
    lockedTitle: { textTransform: 'uppercase' as const },
    lockedRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: 8 },
  };
}
