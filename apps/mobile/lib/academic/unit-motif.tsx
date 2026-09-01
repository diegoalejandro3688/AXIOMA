import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import type { UnitMotifKind } from './unit-motif-map';

export { resolveUnitMotif } from './unit-motif-map';
export type { UnitMotifKind } from './unit-motif-map';

/**
 * STUDY-3 / ESTUDIO A1 -- motivo académico abstracto por unidad, un único
 * sistema visual: `viewBox` 24x24, trazo fino (1.5-1.75), `fill="none"`,
 * `stroke={color}` heredado por prop (nunca hex propio), caps/joins
 * redondeados donde aplica, composición centrada y legible a 26 px.
 *
 * Los 4 motivos de Matemática M1 (`percentage` / `algebra` / `geometry` /
 * `data`) son BYTE-FOR-BYTE los de A0 -- APPROVED, no se tocan. A1 añade los
 * 13 restantes (M2 x4, Lenguaje x3, Ciencias x3, Historia x3) en el mismo
 * lenguaje. `generic` = fallback seguro para un unit code fuera del catálogo.
 */
export function UnitMotif({ motif, color, size = 24 }: { motif: UnitMotifKind; color: string; size?: number }) {
  switch (motif) {
    // ----------------------------- Matemática M1 (A0, intactos) -----------------------------
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

    // ----------------------------- Matemática M2 (A1) -----------------------------
    // Números avanzados / reales / logaritmos: recta numérica + marca radical.
    case 'realNumbers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="16" x2="21" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="7" y1="14" x2="7" y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="12" y1="14" x2="12" y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="17" y1="14" x2="17" y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M5 8.5 L7 11.5 L11 4 H19" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    // Funciones / transformaciones: eje + curva base + curva transformada.
    case 'functionTransform':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="4" y1="4" x2="4" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="4" y1="20" x2="21" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M4 17 C 9 5, 13 5, 20 15" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
          <Path d="M4 20 C 10 12, 14 12, 20 7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    // Geometría avanzada / vectores: círculo + centro + vector con punta.
    case 'vectorGeometry':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="13" r="8" stroke={color} strokeWidth={1.5} />
          <Circle cx="11" cy="13" r="1.2" fill={color} stroke="none" />
          <Line x1="11" y1="13" x2="18.5" y2="6.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
          <Path d="M18.5 6.5 L15.4 6.9 M18.5 6.5 L18.1 9.6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    // Distribuciones / probabilidad: baseline + curva campana + eje central.
    case 'distribution':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="19" x2="21" y2="19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M3 19 C 8 19, 8.5 6, 12 6 C 15.5 6, 16 19, 21 19" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
          <Line x1="12" y1="19" x2="12" y2="8.5" stroke={color} strokeWidth={1} strokeLinecap="round" />
        </Svg>
      );

    // ----------------------------- Lenguaje (A1) -----------------------------
    // Localizar: lupa sobre líneas de texto.
    case 'locate':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="4" y1="5" x2="20" y2="5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="4" y1="9" x2="14" y2="9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx="11" cy="14" r="4.5" stroke={color} strokeWidth={1.5} />
          <Line x1="14.4" y1="17.4" x2="19" y2="21" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
        </Svg>
      );
    // Interpretar: comillas + dos bloques de texto conectados por una curva.
    case 'interpret':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 4.5 Q 3.5 5.5 3.5 7.5 M8 4.5 Q 6.5 5.5 6.5 7.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="4" y1="12" x2="12" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="4" y1="16" x2="9" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M12 14 C 18 14, 16 8, 20 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx="20" cy="8" r="1.5" fill={color} stroke="none" />
        </Svg>
      );
    // Evaluar: líneas de texto/argumento + check fino.
    case 'evaluate':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="4" y1="5" x2="18" y2="5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="4" y1="9.5" x2="18" y2="9.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="4" y1="14" x2="11" y2="14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M12 16 L15 19 L21 11" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    // ----------------------------- Ciencias (A1) -----------------------------
    // Biología: célula -- contorno orgánico + núcleo + organelos discretos.
    case 'cell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3 C 17 3, 21 6.5, 21 11.5 C 21 17, 16.5 21, 11 21 C 6 21, 3 16.5, 4 11 C 5 6, 7.5 3, 12 3 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
          <Circle cx="7.5" cy="8" r="1" fill={color} stroke="none" />
          <Ellipse cx="16.5" cy="15.5" rx="1.8" ry="1.1" stroke={color} strokeWidth={1.25} />
        </Svg>
      );
    // Física: onda sinusoidal + eje mínimo.
    case 'wave':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="2.5" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth={1} strokeLinecap="round" />
          <Path d="M3 12 C 5.5 4, 8.5 4, 11 12 C 13.5 20, 16.5 20, 19 12" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
        </Svg>
      );
    // Química: molécula -- 4 nodos + enlaces.
    case 'molecule':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="7" y1="9" x2="12" y2="6.5" stroke={color} strokeWidth={1.5} />
          <Line x1="12" y1="6.5" x2="13" y2="14" stroke={color} strokeWidth={1.5} />
          <Line x1="13" y1="14" x2="18" y2="12" stroke={color} strokeWidth={1.5} />
          <Line x1="7" y1="9" x2="13" y2="14" stroke={color} strokeWidth={1.5} />
          <Circle cx="6.5" cy="8.5" r="2.2" stroke={color} strokeWidth={1.5} />
          <Circle cx="12" cy="6" r="2.2" stroke={color} strokeWidth={1.5} />
          <Circle cx="13.2" cy="14.5" r="2.2" stroke={color} strokeWidth={1.5} />
          <Circle cx="18.2" cy="11.8" r="2.2" stroke={color} strokeWidth={1.5} />
        </Svg>
      );

    // ----------------------------- Historia (A1) -----------------------------
    // Mundo, América y Chile: globo -- círculo + meridiano + paralelo.
    case 'globe':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
          <Ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth={1.5} />
          <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={1.5} />
          <Path d="M4.5 8 Q 12 10 19.5 8" stroke={color} strokeWidth={1} strokeLinecap="round" />
        </Svg>
      );
    // Formación ciudadana: dos personas + marca cívica de participación.
    case 'citizenship':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="8" r="2.4" stroke={color} strokeWidth={1.5} />
          <Path d="M3.8 19 C 3.8 15.5, 5.7 13.5, 8 13.5 C 10.3 13.5, 12.2 15.5, 12.2 19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx="16" cy="9" r="2.2" stroke={color} strokeWidth={1.5} />
          <Path d="M12.5 19 C 12.5 16, 14.1 14.2, 16 14.2 C 17.9 14.2, 19.5 16, 19.5 19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx="18.5" cy="5" r="2.4" stroke={color} strokeWidth={1.25} />
          <Path d="M17.4 5 L18.2 5.9 L19.8 4" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    // Sistema económico: moneda + flechas de intercambio.
    case 'exchange':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth={1.5} />
          <Path d="M3 7 Q 12 2.5 20.5 6.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M20.5 6.5 L17.6 5.6 M20.5 6.5 L19.8 9.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M21 17 Q 12 21.5 3.5 17.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M3.5 17.5 L6.4 18.4 M3.5 17.5 L4.2 14.6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    // ----------------------------- Fallback -----------------------------
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth={1.5} />
          <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
  }
}
