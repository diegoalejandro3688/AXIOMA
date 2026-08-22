import Svg, { Path, Polygon } from 'react-native-svg';

/**
 * HOME-ASSET-1 -- forma estática de la insignia de nivel (escudo/hexágono).
 * Paleta navy/dorada FIJA, aprobada explícitamente como color ilustrativo
 * del asset, no un token semántico de UI (ver diagnóstico HOME-ASSET-1) --
 * deliberadamente NO recibe `color` por prop, a diferencia del resto de
 * `theme/icons/*`. Sin número dentro del SVG -- lo superpone `LevelBadge`
 * (`components/ui/level-badge.tsx`) como texto real.
 */

const NAVY = '#04203D';
const GOLD = '#C9A24B';
const GOLD_LIGHT = '#E8CD8A';

const OUTER_POINTS = '50,4 90,26 90,68 50,96 10,68 10,26';
const INNER_POINTS = '50,13 81,30.5 81,63.5 50,87 19,63.5 19,30.5';

export interface LevelBadgeShapeProps {
  size?: number;
}

export function LevelBadgeShape({ size = 40 }: LevelBadgeShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={OUTER_POINTS} fill={NAVY} stroke={GOLD} strokeWidth={4} strokeLinejoin="round" />
      <Polygon points={INNER_POINTS} fill="none" stroke={GOLD_LIGHT} strokeWidth={1.25} strokeLinejoin="round" opacity={0.55} />
      {/* Pequeño acento -- única "joya" superior, evita sobrecargar el detalle a 40x40. */}
      <Path d="M50 4 L54.5 12.5 L45.5 12.5 Z" fill={GOLD_LIGHT} />
    </Svg>
  );
}
