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
 * IA -- símbolo propio oficial (AI-1E, corrección de precisión sobre la
 * captura objetivo aprobada -- reemplaza la geometría de AI-1D, demasiado
 * pesada en validación física). Rombo vertical fino: nodo superior + nodo
 * izquierdo + nodo derecho + nodo central (cruce de eje horizontal
 * izquierda-derecha y eje vertical superior-remate), diagonales SUPERIORES
 * (superior->izquierda, superior->derecha) Y diagonales INFERIORES
 * (izquierda->remate, derecha->remate) cerrando la silueta romboidal
 * completa, con un remate en estrella/diamante de 4 puntas (relleno, nunca
 * una flecha).
 *
 * AI-1F -- corrige el peso visual de AI-1E ("icono azul geométrico" ->
 * "red de conocimiento fina y elegante"): trazo MÁS fino (0.85, antes 1.25),
 * nodos MÁS pequeños (r=0.75, antes 1.1) y opacidad reducida en líneas/nodos
 * (0.85/0.8) para que el azul sólido pese menos -- el remate conserva una
 * opacidad ligeramente mayor (0.95) porque es la pieza distintiva de la
 * identidad. Misma geometría conceptual, sin reconstruirla.
 *
 * AI-1H -- microajuste sobre la captura objetivo principal: el nodo
 * superior y el remate inferior pasan de rellenos a HUECOS (solo trazo,
 * `fill="none"`) -- así se leen como parte de la misma red fina que rodea
 * el símbolo en vez de como dos masas sólidas, mientras que izquierda/
 * derecha/centro se mantienen como puntos rellenos pequeños (igual que la
 * referencia). Nunca cerebro, robot, burbuja de chat.
 *
 * AI-1I -- último ajuste de fidelidad a la captura objetivo: trazo aún más
 * fino (0.7, antes 0.7/0.85 mixto) y nodos rellenos aún más pequeños/tenues
 * (r=0.6, opacidad 0.72) -- el símbolo debe leerse "pequeño y preciso"
 * frente a una malla exterior ahora mucho más grande y perceptible (ver
 * `ai-tutor-mark.tsx`).
 *
 * Mismo componente para la tab bar (24px) y para el hero de Tutor Home
 * (`AiTutorMark`, más grande) -- la red decorativa de fondo del hero vive
 * FUERA de este ícono (componente aparte), para no afectar su uso en la tab
 * bar ni en ningún otro consumidor.
 */
export function AiNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Eje vertical: nodo superior -> nodo central -> remate. */}
      <Line x1="12" y1="4" x2="12" y2="17.4" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      {/* Eje horizontal: izquierda -> centro -> derecha (colineales). */}
      <Line x1="5" y1="11" x2="19" y2="11" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      {/* Diagonales superiores (rombo). */}
      <Line x1="12" y1="4" x2="5" y2="11" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      <Line x1="12" y1="4" x2="19" y2="11" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      {/* Diagonales inferiores (cierran el rombo hacia el remate). */}
      <Line x1="5" y1="11" x2="12" y2="17.4" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      <Line x1="19" y1="11" x2="12" y2="17.4" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      {/* Nodo superior -- hueco (solo trazo), se integra con la red fina. */}
      <Circle cx="12" cy="4" r="0.9" fill="none" stroke={color} strokeWidth={0.7} opacity={0.85} />
      {/* Izquierda/derecha/centro -- rellenos, pequeños, sin doble contorno. */}
      <Circle cx="5" cy="11" r="0.6" fill={color} stroke="none" opacity={0.72} />
      <Circle cx="19" cy="11" r="0.6" fill={color} stroke="none" opacity={0.72} />
      <Circle cx="12" cy="11" r="0.6" fill={color} stroke="none" opacity={0.72} />
      {/* Remate: estrella/diamante de 4 puntas, hueca (solo trazo) -- nunca una flecha. */}
      <Path
        d="M12 17.4 12.4 18.6 13.6 19 12.4 19.4 12 20.6 11.6 19.4 10.4 19 11.6 18.6Z"
        fill="none"
        stroke={color}
        strokeWidth={0.6}
        strokeLinejoin="round"
        opacity={0.9}
      />
    </Svg>
  );
}
