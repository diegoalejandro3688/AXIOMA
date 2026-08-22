import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * COMPETE-ASSET-1 -- ilustración decorativa de la card "Pregunta rápida"
 * (Competir). Puramente visual: diana/mira de precisión (círculos
 * concéntricos + cruz central + marcas auxiliares cortas), sin texto ni
 * dato alguno. Uso único (no es un ícono del registro semántico de
 * `theme/icons/`) -- mismo patrón que `home-math-illustration.tsx`.
 * `pointerEvents="none"` para nunca interceptar el toque del `Card`
 * pulsable que la envuelve; se monta como PRIMER hijo para quedar detrás
 * del título/descripción/botón por simple orden de renderizado.
 */
export function QuickQuestionIllustration() {
  const tokens = useTheme();
  const stroke = tokens.color.accent.default;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -15, bottom: -15, width: 120, height: 120, opacity: 0.2 }}>
      <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
        {/* Círculos concéntricos -- diana */}
        <Circle cx="60" cy="60" r="50" stroke={stroke} strokeWidth={2} />
        <Circle cx="60" cy="60" r="34" stroke={stroke} strokeWidth={2} />
        <Circle cx="60" cy="60" r="18" stroke={stroke} strokeWidth={2} />
        {/* Mira central */}
        <Circle cx="60" cy="60" r="2.5" fill={stroke} />
        {/* Marcas auxiliares cortas -- graduación exterior */}
        <Line x1="60" y1="4" x2="60" y2="14" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1="60" y1="106" x2="60" y2="116" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Line x1="4" y1="60" x2="14" y2="60" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
