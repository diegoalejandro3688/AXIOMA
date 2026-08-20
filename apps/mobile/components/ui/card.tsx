import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, radii, spacing, getElevation, useColorSchemeName } from '../../theme';
import type { ThemeTokens } from '../../theme';

export type CardVariant = 'surface' | 'outlined' | 'brand' | 'subtle' | 'state' | 'interactive';
export type CardStateTone = 'success' | 'error' | 'warning' | 'info';

export interface CardProps {
  variant?: CardVariant;
  stateTone?: CardStateTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Contenedor de tarjeta -- variantes `surface/outlined/brand/subtle/state/interactive`. */
export function Card({ variant = 'surface', stateTone = 'info', onPress, accessibilityLabel, style, children }: CardProps) {
  const tokens = useTheme();
  const scheme = useColorSchemeName();
  const containerStyle = cardStyle(tokens, variant, stateTone, scheme);

  if (variant === 'interactive' || onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [containerStyle, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

function cardStyle(t: ThemeTokens, variant: CardVariant, stateTone: CardStateTone, scheme: 'light' | 'dark'): ViewStyle {
  const base: ViewStyle = {
    borderRadius: radii.large,
    padding: spacing.space4,
  };

  switch (variant) {
    case 'surface':
      return { ...base, backgroundColor: t.color.background.surface, ...getElevation(1, scheme) };
    case 'outlined':
      return { ...base, backgroundColor: t.color.background.surface, borderWidth: 1, borderColor: t.color.border.default };
    case 'brand':
      return { ...base, backgroundColor: t.color.background.inverse };
    case 'subtle':
      return { ...base, backgroundColor: t.color.accent.subtleBg };
    case 'state':
      return {
        ...base,
        backgroundColor: t.color.state[stateTone].background,
        borderWidth: 1,
        borderColor: t.color.state[stateTone].border,
      };
    case 'interactive':
      return { ...base, backgroundColor: t.color.background.surface, ...getElevation(1, scheme) };
  }
}
