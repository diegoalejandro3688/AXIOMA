import { useTheme, iconRegistry } from '../../theme';
import type { IconName } from '../../theme';

export type IconColorToken = 'primary' | 'secondary' | 'muted' | 'onAccent' | 'onInverse' | 'accent' | 'error';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: IconColorToken | string;
}

/** Wrapper tipado sobre `react-native-svg` -- resuelve contra `theme/icons/index.ts`. */
export function Icon({ name, size = 24, color = 'primary' }: IconProps) {
  const tokens = useTheme();
  const IconComponent = iconRegistry[name];
  const resolvedColor = resolveIconColor(color, tokens);

  return <IconComponent size={size} color={resolvedColor} />;
}

function resolveIconColor(color: IconColorToken | string, tokens: ReturnType<typeof useTheme>): string {
  switch (color) {
    case 'primary':
      return tokens.color.text.primary;
    case 'secondary':
      return tokens.color.text.secondary;
    case 'muted':
      return tokens.color.text.muted;
    case 'onAccent':
      return tokens.color.text.onAccent;
    case 'onInverse':
      return tokens.color.text.onInverse;
    case 'accent':
      return tokens.color.accent.default;
    case 'error':
      return tokens.color.state.error.text;
    default:
      return color;
  }
}
