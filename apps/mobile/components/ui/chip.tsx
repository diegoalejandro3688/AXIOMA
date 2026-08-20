import { View } from 'react-native';
import { useTheme, radii, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from './text';

export type ChipVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'disabled' | 'selected';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
}

/** Chip/etiqueta corta -- variantes `neutral/accent/success/warning/error/disabled/selected`. */
export function Chip({ label, variant = 'neutral' }: ChipProps) {
  const tokens = useTheme();
  const { backgroundColor, textColor } = chipColors(tokens, variant);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor,
        borderRadius: radii.full,
        paddingHorizontal: spacing.space3,
        paddingVertical: spacing.space1,
      }}
      accessibilityRole="text"
    >
      <Text variant="label" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

function chipColors(t: ThemeTokens, variant: ChipVariant): { backgroundColor: string; textColor: string } {
  switch (variant) {
    case 'neutral':
      return { backgroundColor: t.color.background.surface, textColor: t.color.text.secondary };
    case 'accent':
      return { backgroundColor: t.color.accent.subtleBg, textColor: t.color.accent.strong };
    case 'success':
      return { backgroundColor: t.color.state.success.background, textColor: t.color.state.success.text };
    case 'warning':
      return { backgroundColor: t.color.state.warning.background, textColor: t.color.state.warning.text };
    case 'error':
      return { backgroundColor: t.color.state.error.background, textColor: t.color.state.error.text };
    case 'disabled':
      return { backgroundColor: t.color.action.disabledBackground, textColor: t.color.action.disabledText };
    case 'selected':
      return { backgroundColor: t.color.accent.default, textColor: t.color.text.onAccent };
  }
}
