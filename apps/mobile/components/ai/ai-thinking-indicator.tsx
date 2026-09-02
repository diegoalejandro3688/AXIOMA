import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { AiTutorMark } from './ai-tutor-mark';
import { Text } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

const DOT_COUNT = 3;
const DOT_MIN = 0.28;
const DOT_MAX = 1;
const PULSE_MS = 340;
const STAGGER_MS = 150;

/**
 * Estado "Tutor IA está pensando" mientras se espera la respuesta real del
 * envío. Reutiliza EXACTAMENTE la misma identidad discreta que una respuesta
 * del Tutor (`AiTutorMark` size 18 + "Tutor IA", igual que
 * `ai-message-bubble.tsx`), seguida de tres puntos en bucle desfasado.
 *
 * Animación con `Animated` del núcleo de React Native (sin dependencia
 * nueva): transición suave de `opacity` + escala muy ligera, nunca saltos
 * duros. `useNativeDriver: true`. El caller controla el montaje/desmontaje
 * según el estado REAL del envío -- este componente solo anima mientras está
 * montado y detiene/limpia todo en el cleanup del efecto.
 */
export function AiThinkingIndicator() {
  const styles = useThemedStyles(createStyles);
  const values = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(DOT_MIN))).current;

  useEffect(() => {
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STAGGER_MS),
          Animated.timing(value, { toValue: DOT_MAX, duration: PULSE_MS, useNativeDriver: true }),
          Animated.timing(value, { toValue: DOT_MIN, duration: PULSE_MS, useNativeDriver: true }),
          Animated.delay((DOT_COUNT - 1 - index) * STAGGER_MS),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
      values.forEach((value) => value.setValue(DOT_MIN));
    };
  }, [values]);

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Tutor IA está pensando">
      <View style={styles.identityRow}>
        <AiTutorMark size={18} />
        <Text variant="caption" color="muted" style={styles.author}>
          Tutor IA
        </Text>
      </View>
      <View style={styles.dots}>
        {values.map((value, index) => (
          <Animated.View key={index} style={[styles.dot, { opacity: value, transform: [{ scale: value }] }]} />
        ))}
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 6 },
    identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    author: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    dots: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingLeft: 2 },
    dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: t.color.text.muted },
  };
}
