import Svg, { Circle, Line } from 'react-native-svg';
import { useColorSchemeName } from '../../theme';

/**
 * AUTH-1A -- símbolo oficial de Zetrynd, transcrito LITERALMENTE del asset
 * aprobado (`logo axioma.html`, dos variantes SVG inline: "Vértice sobre
 * claro"/"Vértice sobre oscuro"). Ninguna coordenada, `viewBox`,
 * `stroke-width` ni proporción fue reinterpretada -- es la misma geometría
 * exacta del asset, solo trasladada a `react-native-svg`/JSX.
 *
 * El asset trae DOS variantes de color ya resueltas por el propio diseño
 * (no un solo trazo themable vía `currentColor`): `#04203D` sobre fondo
 * claro, `#F5F6F8` sobre fondo oscuro, ambas con el mismo nodo `#378ADD`.
 * Por eso este componente hardcodea esos 3 hex -- son los valores LITERALES
 * del asset oficial, no colores inventados; no hay tokens equivalentes
 * porque el asset no fue diseñado para derivarse de la paleta semántica
 * actual (STUDY-3/AI-1 etc.), sino que ES la fuente de la marca.
 *
 * `width`/`height` SIEMPRE iguales (recibe un único `size`) para preservar
 * el aspect ratio 1:1 del lienzo original (`viewBox="0 0 150 150"`).
 * Contiene SOLO el símbolo -- el wordmark "ZETRYND" se renderiza aparte
 * como texto (`AuthBrandHeader`), nunca como parte de este SVG.
 */
export function ZetryndMark({ size = 64 }: { size?: number }) {
  const scheme = useColorSchemeName();
  const strokeColor = scheme === 'dark' ? '#F5F6F8' : '#04203D';

  return (
    <Svg width={size} height={size} viewBox="0 0 150 150" fill="none" accessibilityLabel="Zetrynd">
      <Line x1="60" y1="20" x2="20" y2="90" stroke={strokeColor} strokeWidth={9} strokeLinecap="round" />
      <Line x1="60" y1="20" x2="124.7" y2="133.3" stroke={strokeColor} strokeWidth={9} strokeLinecap="round" />
      <Circle cx="60" cy="20" r="9" fill="#378ADD" />
    </Svg>
  );
}
