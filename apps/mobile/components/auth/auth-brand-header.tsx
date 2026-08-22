import { View } from 'react-native';
import { ZetryndMark } from './zetrynd-mark';
import { Text } from '../ui';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * AUTH-1A -- identidad visual compartida de Login/Registro (evita
 * divergencias entre ambas pantallas). Símbolo oficial (`ZetryndMark`,
 * transcripción literal del asset aprobado) + wordmark "ZETRYND" (texto,
 * el asset NO incluye wordmark -- nunca se inventa un logo combinado) +
 * separador/acento + lema real de marca ("Aprende. Progresa. Supérate."),
 * mismo copy en ambas pantallas.
 */
export function AuthBrandHeader() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <ZetryndMark size={72} />
      <Text variant="heading1" style={styles.wordmark} accessibilityRole="header">
        ZETRYND
      </Text>
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
    wordmark: { letterSpacing: 4, marginTop: spacing.space2 },
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
