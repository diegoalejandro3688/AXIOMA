import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * Los 5 iconos de navegación -- bloque 6.6 del .md. Caja nominal 24x24,
 * trazo 2px, extremos/uniones redondeados, color heredado vía prop `color`
 * (nunca hex fijo dentro del path). No se conectan a la tab bar en UI-1
 * (eso es UI-2) -- se crean como primitivas de icono ya usables desde
 * `Icon`/`Button`.
 */

export interface NavIconProps {
  size?: number;
  color: string;
}

/** Perfil -- persona clásica (cabeza + hombros, silueta simple). */
export function ProfileNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M4 20c0-3.9 3.58-7 8-7s8 3.1 8 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Competir -- laureles (corona abierta, dos ramas). Nunca trofeo. */
export function CompeteNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10c-1.5 2.5-1.5 6 1 8.5M6 10c-1-1.5-1-3 0-4.5M6 10c1 .3 2 .2 3-.3M6 5.5c1.2.3 2.1 1 2.6 2M18 10c1.5 2.5 1.5 6-1 8.5M18 10c1-1.5 1-3 0-4.5M18 10c-1 .3-2 .2-3-.3M18 5.5c-1.2.3-2.1 1-2.6 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 6v11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Inicio -- casa de contorno simple. */
export function HomeNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5 12 4l8 7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 1 1 4 0v5h3a1 1 0 0 0 1-1v-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Estudio -- compás de dibujo (geométrico, no brújula). */
export function StudyNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5.5" r="1.5" stroke={color} strokeWidth={2} />
      <Path
        d="M12 7 5.5 19M12 7l6.5 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.5 13h7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5.5 19h13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * IA -- símbolo propio: estructura de nodos conectados con remate inferior
 * en rombo/vértice (referencia visual: 12-tutor-ia-hub-dark-APROBADA.png).
 * Nunca cerebro, robot, burbuja de chat.
 */
export function AiNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="4.5" x2="6" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="4.5" x2="18" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6" y1="10" x2="12" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="10" x2="12" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="14" x2="12" y2="19.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="4.5" r="1.5" stroke={color} strokeWidth={2} />
      <Circle cx="6" cy="10" r="1.5" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="10" r="1.5" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="14" r="1.5" stroke={color} strokeWidth={2} />
      <Path d="M9.5 19.5 12 22l2.5-2.5H9.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}
