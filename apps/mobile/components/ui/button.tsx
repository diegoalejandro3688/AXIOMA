import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { ThemeTokens, IconName, ButtonHeightToken } from '../../theme';
import { radii, layout } from '../../theme';
import { Text } from './text';
import { Icon } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'icon';
export type ButtonSize = ButtonHeightToken;

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Botón -- variantes `primary/secondary/tertiary/danger/icon`, tamaños `large/medium/small`. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const tokens = useTheme();
  const isDisabled = disabled || loading;
  const height = layout.buttonHeight[size];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        buttonContainerStyle(tokens, variant, height, isDisabled, pressed),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={textColorFor(tokens, variant, isDisabled)}
          accessibilityLabel="Cargando"
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Icon name={icon} size={20} color={textColorFor(tokens, variant, isDisabled)} /> : null}
          <Text variant="titleMedium" weight="semibold" style={{ color: textColorFor(tokens, variant, isDisabled) }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function buttonContainerStyle(
  t: ThemeTokens,
  variant: ButtonVariant,
  height: number,
  disabled: boolean,
  pressed: boolean,
): ViewStyle {
  const base: ViewStyle = {
    minHeight: Math.max(height, layout.minTouchTarget),
    height,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    opacity: pressed && !disabled ? 0.85 : 1,
  };

  if (disabled) {
    return {
      ...base,
      backgroundColor: variant === 'tertiary' || variant === 'icon' ? 'transparent' : t.color.action.disabledBackground,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: t.color.action.disabledBorder,
    };
  }

  switch (variant) {
    case 'primary':
      return { ...base, backgroundColor: t.color.accent.default };
    case 'secondary':
      return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor: t.color.accent.default };
    case 'tertiary':
      return { ...base, backgroundColor: 'transparent' };
    case 'danger':
      return { ...base, backgroundColor: t.color.state.error.text };
    case 'icon':
      return { ...base, backgroundColor: 'transparent', paddingHorizontal: 0, width: height };
  }
}

function textColorFor(t: ThemeTokens, variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return t.color.action.disabledText;
  switch (variant) {
    case 'primary':
    case 'danger':
      return t.color.text.onAccent;
    case 'secondary':
    case 'tertiary':
    case 'icon':
      return t.color.accent.default;
  }
}
