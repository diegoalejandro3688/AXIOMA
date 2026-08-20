import { View } from 'react-native';
import { useTheme, borders } from '../../theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
}

/** Línea divisoria -- color `border.default`, horizontal o vertical. */
export function Divider({ orientation = 'horizontal' }: DividerProps) {
  const tokens = useTheme();

  if (orientation === 'vertical') {
    return <View style={{ width: borders.hairline, alignSelf: 'stretch', backgroundColor: tokens.color.border.default }} />;
  }

  return <View style={{ height: borders.hairline, width: '100%', backgroundColor: tokens.color.border.default }} />;
}
