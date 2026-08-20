import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { layout, radii } from '../../theme';
import type { IconName } from '../../theme';
import { Icon } from './icon';
import type { IconColorToken } from './icon';

export interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: IconColorToken | string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Caja táctil 44x44 mínima con un glifo 20-24 -- `accessibilityLabel` es obligatorio. */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  color = 'primary',
  size = 24,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          minWidth: layout.minTouchTarget,
          minHeight: layout.minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.full,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={disabled ? 'muted' : color} />
    </Pressable>
  );
}
