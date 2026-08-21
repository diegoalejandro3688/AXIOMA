import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme, radii, spacing, layout } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from './text';

export type AnswerOptionState = 'default' | 'selected' | 'submitting' | 'correct' | 'incorrect' | 'disabled';

export interface AnswerOptionProps {
  /** Contenido de la alternativa -- normalmente `ContentBlockRenderer`, inyectado por el llamador. Sin lógica de negocio aquí. */
  children: ReactNode;
  /** Prefijo tipo "A)" (Ejercicio) -- opcional, Pregunta rápida no lo usa. */
  label?: string;
  state: AnswerOptionState;
  onPress: () => void;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'radio';
  accessibilityLabel: string;
}

/**
 * Fila de alternativa reutilizable entre Ejercicio y Pregunta rápida (.md
 * 8.23) -- presentación pura: recibe el estado ya calculado por el
 * llamador (`isSelected`, `answered?.isCorrect`, etc.) y un callback,
 * nunca decide corrección ni envía nada por su cuenta. `accessibilityRole`
 * es configurable porque ambos flujos difieren en semántica de
 * accesibilidad (Ejercicio = "button", Pregunta rápida = "radio").
 */
export function AnswerOption({
  children,
  label,
  state,
  onPress,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
}: AnswerOptionProps) {
  const tokens = useTheme();
  const isSubmittingThis = state === 'submitting';
  const isInteractionDisabled = disabled || state === 'correct' || state === 'incorrect' || state === 'disabled';

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInteractionDisabled, selected: state === 'selected' || state === 'submitting' }}
      disabled={isInteractionDisabled}
      onPress={onPress}
      style={[containerStyle(tokens, state), { minHeight: layout.minTouchTarget }]}
    >
      {label ? (
        <Text variant="label" style={{ color: tokens.color.text.primary }}>
          {label})
        </Text>
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
      {isSubmittingThis ? <ActivityIndicator size="small" color={tokens.color.accent.default} /> : null}
    </Pressable>
  );
}

function containerStyle(t: ThemeTokens, state: AnswerOptionState) {
  const base = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.space2,
    padding: spacing.space3,
    borderRadius: radii.medium,
    borderWidth: 1,
  };
  switch (state) {
    case 'correct':
      return { ...base, backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border };
    case 'incorrect':
      return { ...base, backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border };
    case 'submitting':
      return { ...base, backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border };
    case 'selected':
      return { ...base, backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default };
    case 'disabled':
      return { ...base, backgroundColor: t.color.action.disabledBackground, borderColor: t.color.action.disabledBorder };
    default:
      return { ...base, backgroundColor: t.color.background.surface, borderColor: t.color.border.default };
  }
}
