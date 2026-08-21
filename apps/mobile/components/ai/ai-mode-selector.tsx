import { Pressable, ScrollView, View } from 'react-native';
import type { AiAssistanceMode } from '@axioma/contracts';
import { ASSISTANCE_MODE_OPTIONS } from '../../lib/ai/assistance-modes';
import { Text, Chip } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Selector de modo pedagógico (Incremento 5, decisión E). Cada opción lleva
 * el enum CANÓNICO del contrato como valor; la etiqueta en español es solo
 * presentación (ver `lib/ai/assistance-modes.ts`).
 *
 * La opción por defecto es "Automático" = `null`: en ese caso el cliente NO
 * envía `requestedMode` y el backend aplica su propia progresión (nunca
 * `WORKED_SOLUTION`). Mobile no infiere el modo del texto del estudiante ni
 * fuerza `HINT_FIRST` -- esa decisión pertenece al dominio, no a la UI.
 */
export function AiModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: AiAssistanceMode | null;
  onChange: (mode: AiAssistanceMode | null) => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const selected = ASSISTANCE_MODE_OPTIONS.find((option) => option.value === value) ?? ASSISTANCE_MODE_OPTIONS[0]!;

  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary" style={styles.label}>
        Cómo quieres que te ayude
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ASSISTANCE_MODE_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value ?? 'AUTO'}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !!disabled }}
              accessibilityLabel={`Modo ${option.label}`}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={disabled ? styles.optionDisabled : undefined}
            >
              <Chip label={option.label} variant={isSelected ? 'selected' : 'neutral'} />
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="caption" color="muted">
        {selected.description}
      </Text>
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 6 },
    label: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    row: { flexDirection: 'row' as const, gap: 8, paddingRight: 8 },
    optionDisabled: { opacity: 0.5 },
  };
}
