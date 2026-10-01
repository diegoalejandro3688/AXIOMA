import { View } from 'react-native';
import { ZetryndMark } from './zetrynd-mark';
import { ZetryndWordmark } from './zetrynd-wordmark';
import { Text } from '../ui';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * AUTH-1A -- identidad visual compartida de Login/Registro (evita
 * divergencias entre ambas pantallas). Símbolo oficial (`ZetryndMark`) +
 * wordmark oficial (`ZetryndWordmark`, vectorial -- ver TESTER-DISTRIBUTION-1B.1b/1B.2:
 * el `<Text>ZETRYND</Text>` con fuente de plataforma que había aquí antes
 * NO era el wordmark oficial) + separador/acento + lema real de marca
 * ("Aprende. Progresa. Supérate."), mismo copy en ambas pantallas.
 */
export function AuthBrandHeader() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <ZetryndMark size={72} />
      <View accessibilityRole="header" style={styles.wordmark}>
        <ZetryndWordmark size={24} />
      </View>
      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <View style={styles.separatorDot} />
        <View style={styles.separatorLine} />
      </View>
      <Text variant="bodySmall" color="secondary" style={styles.tagline}>
        Aprende. Progresa. Supérate.
      </Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { alignItems: 'center' as const, gap: spacing.space2 },
    wordmark: { marginTop: spacing.space2 },
    separator: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space2,
      alignSelf: 'stretch' as const,
      marginTop: spacing.space1,
    },
    separatorLine: { flex: 1, height: 1, backgroundColor: t.color.border.default },
    separatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.color.accent.default,
      transform: [{ rotate: '45deg' }],
    },
    tagline: { textAlign: 'center' as const },
  };
}
