import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { UnitMotifKind } from './unit-motif-map';

export { resolveUnitMotif } from './unit-motif-map';
export type { UnitMotifKind } from './unit-motif-map';

/**
 * STUDY-3 -- motivo académico abstracto por unidad, mismo lenguaje que
 * `SubjectDecoration` (`estudio/index.tsx`, STUDY-1B/1C): trazo fino
 * (1.5-1.75px), sin relleno salvo acentos puntuales, color heredado por
 * prop (nunca hex propio).
 *
 * ESTUDIO A0 -- movido sin cambios desde `unidades.tsx`. Geometría SVG,
 * props (`motif` / `color` / `size` con default 24) y `strokeWidth` son
 * byte-for-byte los del original.
 */
export function UnitMotif({ motif, color, size = 24 }: { motif: UnitMotifKind; color: string; size?: number }) {
  switch (motif) {
    case 'percentage':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="7" cy="7" r="3" stroke={color} strokeWidth={1.75} />
          <Circle cx="17" cy="17" r="3" stroke={color} strokeWidth={1.75} />
          <Line x1="5" y1="19" x2="19" y2="5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
        </Svg>
      );
    case 'algebra':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="20" x2="3" y2="4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M4.5 16c2-6 4.5-10 7-10s2.5 8 4.5 8 2-3 4-3" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'geometry':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4 20.5 19H3.5Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
          <Circle cx="12" cy="4" r="1.3" fill={color} stroke="none" />
          <Circle cx="20.5" cy="19" r="1.3" fill={color} stroke="none" />
          <Circle cx="3.5" cy="19" r="1.3" fill={color} stroke="none" />
        </Svg>
      );
    case 'data':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Rect x="5" y="12" width="3" height="8" stroke={color} strokeWidth={1.5} />
          <Rect x="10.5" y="7" width="3" height="13" stroke={color} strokeWidth={1.5} />
          <Rect x="16" y="15" width="3" height="5" stroke={color} strokeWidth={1.5} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth={1.5} />
          <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
  }
}
