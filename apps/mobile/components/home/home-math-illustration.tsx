import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * HOME-ASSET-2 -- ilustración decorativa del card "Objetivo de hoy" /
 * "Continúa donde quedaste" de Inicio. Puramente visual: construcción
 * geométrica abstracta (arco de compás, reglas cruzadas, puntos
 * auxiliares), sin texto ni dato alguno -- nunca representa la materia/
 * unidad real (esa asociación sigue sin existir, ver HOME-AUDIT).
 *
 * Posicionamiento/opacidad fijos aquí mismo (uso único, no es un ícono del
 * registro semántico de `theme/icons/`) -- `pointerEvents="none"` para
 * nunca interceptar el toque del botón/card que queda encima por simple
 * orden de renderizado (se monta como PRIMER hijo del card).
 */
export function HomeMathIllustration() {
  const tokens = useTheme();
  const stroke = tokens.color.accent.default;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: -25, bottom: -25, width: 160, height: 160, opacity: 0.2 }}
    >
      <Svg width={160} height={160} viewBox="0 0 160 160" fill="none">
        {/* Arco de compás -- círculo incompleto (~270°) */}
        <Path d="M120 80a40 40 0 1 1-14.1-30.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        {/* Regla/escuadra -- dos líneas cruzadas */}
        <Line x1="30" y1="130" x2="110" y2="40" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1="45" y1="35" x2="130" y2="100" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        {/* Puntos auxiliares de construcción */}
        <Circle cx="80" cy="80" r="2.5" fill={stroke} />
        <Circle cx="30" cy="130" r="2.5" fill={stroke} />
        <Circle cx="130" cy="100" r="2.5" fill={stroke} />
      </Svg>
    </View>
  );
}
