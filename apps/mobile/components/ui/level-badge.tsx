import { View } from 'react-native';
import { LevelBadgeShape } from '../../theme/icons/level-badge-icon';
import { Text } from './text';

export interface LevelBadgeProps {
  levelNumber: number;
  size?: number;
}

/**
 * Insignia de nivel -- HOME-ASSET-1. Gráfico estático (`LevelBadgeShape`,
 * paleta navy/dorada fija) con el número de nivel como `<Text>` real
 * superpuesto -- NUNCA rasterizado dentro del SVG, así que sigue
 * actualizándose solo cuando cambie `levelNumber` (mismo patrón que
 * `Avatar`: gráfico estático + contenido dinámico en capas separadas).
 */
export function LevelBadge({ levelNumber, size = 40 }: LevelBadgeProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size }}>
        <LevelBadgeShape size={size} />
      </View>
      <Text
        weight="bold"
        accessibilityLabel={`Nivel ${levelNumber}`}
        style={{
          color: '#F5E7C4',
          fontSize: Math.round(size * 0.34),
          lineHeight: Math.round(size * 0.34 * 1.1),
          textAlign: 'center',
        }}
      >
        {levelNumber}
      </Text>
    </View>
  );
}
