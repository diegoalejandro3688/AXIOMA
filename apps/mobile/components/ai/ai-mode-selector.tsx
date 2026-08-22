import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { AiAssistanceMode } from '@axioma/contracts';
import { ASSISTANCE_MODE_OPTIONS, describeAssistanceMode } from '../../lib/ai/assistance-modes';
import { Text, Icon, Dialog } from '../ui';
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
 *
 * AI-2A -- presentación reescrita: de una fila de `Chip`s horizontales
 * ("Cómo quieres que te ayude" + chips) a un trigger compacto ("Automático
 * ⌄") que abre un `Dialog` con las 5 opciones -- mismo patrón visual ya
 * aprobado en Tutor IA Home (AI-1B), implementado aquí de forma propia
 * (Home no expone un componente compartido; su versión vive inline en
 * `index.tsx`, congelado, sin tocar). Contrato del componente (`value`/
 * `onChange`/`disabled`) sin cambios -- `conversation/[conversationId].tsx`
 * lo consume exactamente igual que antes. Mismas 5 opciones reales
 * (`ASSISTANCE_MODE_OPTIONS`), mismo `describeAssistanceMode`, sin tocar
 * `assistance-modes.ts`.
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityLabel={`Modo de asistencia: ${describeAssistanceMode(value)}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        <Text variant="label" color="secondary">
          {describeAssistanceMode(value)}
        </Text>
        <Icon name="chevron-down" size={16} color="muted" />
      </Pressable>

      <Dialog visible={open} title="Cómo quieres que te ayude" onRequestClose={() => setOpen(false)}>
        <View style={styles.options}>
          {ASSISTANCE_MODE_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value ?? 'AUTO'}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Modo ${option.label}`}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              >
                <View style={styles.optionText}>
                  <Text variant="titleMedium" weight={isSelected ? 'semibold' : 'regular'}>
                    {option.label}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {option.description}
                  </Text>
                </View>
                {isSelected ? <Icon name="check" size={18} color="accent" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    trigger: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      alignSelf: 'flex-start' as const,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: t.color.background.default,
    },
    triggerDisabled: { opacity: 0.5 },
    options: { gap: 4 },
    optionRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    optionRowSelected: { backgroundColor: t.color.accent.subtleBg },
    optionText: { flex: 1, gap: 2 },
  };
}
