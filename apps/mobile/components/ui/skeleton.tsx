import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, radii } from '../../theme';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bloque animado (opacidad) para preparar los futuros loaders de estructura
 * conocida (Materias/Unidades/Clasificación -- UI-3/4, no se conecta aún).
 * Respeta `reduce motion`: si el usuario lo activa, se muestra estático.
 */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const tokens = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
      if (enabled) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ]),
      );
      animation.start();
    });

    return () => animation?.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? radii.small,
          backgroundColor: tokens.color.action.disabledBackground,
          opacity,
        },
        style,
      ]}
    />
  );
}
