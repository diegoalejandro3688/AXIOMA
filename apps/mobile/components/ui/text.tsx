import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme, typeScale } from '../../theme';
import type { ThemeTokens, TypographyVariant, FontWeightToken } from '../../theme';

export type TextColorToken = 'primary' | 'secondary' | 'muted' | 'onAccent' | 'onInverse' | 'error' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColorToken;
  weight?: FontWeightToken;
}

const weightValue: Record<FontWeightToken, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

function resolveColor(t: ThemeTokens, color: TextColorToken): string {
  switch (color) {
    case 'primary':
      return t.color.text.primary;
    case 'secondary':
      return t.color.text.secondary;
    case 'muted':
      return t.color.text.muted;
    case 'onAccent':
      return t.color.text.onAccent;
    case 'onInverse':
      return t.color.text.onInverse;
    case 'error':
      return t.color.state.error.text;
    case 'success':
      return t.color.state.success.text;
  }
}

/** Primitiva de texto -- `variant` mapea a la escala tipográfica, `color` a tokens semánticos. */
export function Text({ variant = 'body', color = 'primary', weight, style, ...rest }: TextProps) {
  const tokens = useTheme();
  const scale = typeScale[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          fontWeight: weight ? weightValue[weight] : scale.fontWeight,
          color: resolveColor(tokens, color),
        },
        style,
      ]}
    />
  );
}
