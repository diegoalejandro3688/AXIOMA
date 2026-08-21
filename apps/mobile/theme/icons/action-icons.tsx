import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { NavIconProps } from './nav-icons';

/**
 * Iconos de acción mínimos para las primitivas de UI-1 -- caja 24x24,
 * trazo 2px, extremos/uniones redondeados, color heredado vía prop.
 */

export function ChevronRightIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BackArrowIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 6.5 10 6.5a13.6 13.6 0 0 1-3.1 3.9M6.5 6.8C4 8.4 2 11.5 2 11.5s3.5 6.5 10 6.5c1.2 0 2.3-.2 3.3-.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.9 12.6a2.5 2.5 0 0 0 3.5 3.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function XCircleIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="11" x2="12" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="7.75" r="1" fill={color} stroke="none" />
    </Svg>
  );
}

/**
 * Iconos de estado/académicos añadidos en UI-3 (README UI-3, "no crear
 * archivos nuevos... añádela dentro de theme/icons/ existente si faltaba
 * un icono de UI-1"). Mismas reglas: caja 24x24, trazo 2px, extremos/
 * uniones redondeados, color heredado por prop, nunca hex fijo.
 */

/** Racha -- llama funcional (.md 6.13), nunca el emoji 🔥. */
export function FlameIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c1 2.5-.5 3.8-1.7 5.2C9 9.7 8 11.2 8 13a4 4 0 0 0 8 0c0-1.2-.5-2.1-1.1-3 .4 1.6-.3 2.6-1.2 2.6-1 0-1.4-.8-1.1-1.7C13 9.5 13.5 6.3 12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 16.5a3 3 0 0 0 6 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Liga -- escudo genérico lineal (sin datos de división/posición todavía). */
export function ShieldIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Materias -- Matemática: raíz cuadrada. */
export function SquareRootIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 13.5h2.5L9 19l4.5-14H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Materias -- Ciencias: matraz. */
export function FlaskIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 3h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-8.5V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7.5 15h9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Materias -- Historia: columna clásica. */
export function ColumnIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16M4 20h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M6.5 6.5v13M9.5 6.5v13M14.5 6.5v13M17.5 6.5v13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Materias -- Lenguaje: libro abierto. */
export function OpenBookIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.5c-1.5-1.3-3.4-2-6-2v12.5c2.6 0 4.5.7 6 2 1.5-1.3 3.4-2 6-2V4.5c-2.6 0-4.5.7-6 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 6.5v12.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

