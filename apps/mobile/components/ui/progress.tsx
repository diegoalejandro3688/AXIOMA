import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useTheme, radii } from '../../theme';

export interface ProgressProps {
  /** Valor normalizado 0-1, recibido por prop -- nunca calculado dentro del componente. */
  value: number;
  color?: string;
  accessibilityLabel: string;
  height?: number;
}

const FILL_ANIMATION_DURATION_MS = 350;

/**
 * VC4 (motion pass) -- desplazamiento animado del relleno cuando `value`
 * cambia (incluye el overlay optimista de XP). `width` en RN no admite
 * `useNativeDriver: true` (solo `opacity`/`transform`); `scaleX` fue
 * descartado a propósito: su origen de transformación por defecto es el
 * centro, no la izquierda, y este proyecto no usa `transformOrigin` en
 * ningún otro lugar -- reproducir el relleno "desde la izquierda" con
 * scaleX habría exigido esa API sin precedente probado aquí, con riesgo
 * real de verse distinto al relleno estático actual. `width` animado
 * (JS-driven) preserva EXACTAMENTE el mismo layout/aspecto que la versión
 * estática, solo que interpolado -- mismo criterio de "no arriesgar el
 * aspecto visual" que pedía la tarea.
 *
 * Respeta Reduce Motion (mismo patrón que `skeleton.tsx`): si está activo,
 * el valor se aplica directamente, sin animar. La animación NUNCA corre en
 * el primer render (se pinta el valor inicial tal cual) -- solo ante un
 * CAMBIO real de `value`.
 */
export function Progress({ value, color, accessibilityLabel, height = 8 }: ProgressProps) {
  const tokens = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const fillColor = color ?? tokens.color.accent.default;

  const animatedValue = useRef(new Animated.Value(clamped)).current;
  const reduceMotionRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
    // Suscripción en vivo -- si el usuario cambia la preferencia mientras la
    // pantalla está montada, la próxima animación ya la respeta.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      animatedValue.setValue(clamped);
      return;
    }
    if (reduceMotionRef.current) {
      animatedValue.setValue(clamped);
      return;
    }
    Animated.timing(animatedValue, {
      toValue: clamped,
      duration: FILL_ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  const animatedWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radii.full,
        backgroundColor: tokens.color.action.disabledBackground,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          width: animatedWidth,
          borderRadius: radii.full,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
