import { View } from 'react-native';
import { useTheme, radii } from '../../theme';

export interface ProgressProps {
  /** Valor normalizado 0-1, recibido por prop -- nunca calculado dentro del componente. */
  value: number;
  color?: string;
  accessibilityLabel: string;
  height?: number;
}

/** Barra de progreso lineal -- `value` normalizado 0-1, color inyectable, etiqueta accesible obligatoria. */
export function Progress({ value, color, accessibilityLabel, height = 8 }: ProgressProps) {
  const tokens = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const fillColor = color ?? tokens.color.accent.default;

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
      <View
        style={{
          height: '100%',
          width: `${clamped * 100}%`,
          borderRadius: radii.full,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
