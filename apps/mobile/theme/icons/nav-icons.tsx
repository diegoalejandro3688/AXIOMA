import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * Los 5 iconos de navegación -- bloque 6.6 del .md. Caja nominal 24x24,
 * trazo 2px, extremos/uniones redondeados, color heredado vía prop `color`
 * (nunca hex fijo dentro del path). No se conectan a la tab bar en UI-1
 * (eso es UI-2) -- se crean como primitivas de icono ya usables desde
 * `Icon`/`Button`.
 *
 * NAV-1 -- Perfil/Competir/Inicio/Estudio reconstruidos sobre la captura
 * objetivo aprobada (ver auditoría NAV-1); `AiNavIcon` conserva su
 * geometría exacta (ver su propia nota) -- solo se ajustó su peso óptico.
 */

export interface NavIconProps {
  size?: number;
  color: string;
}

/**
 * Perfil -- NAV-1: silueta de usuario contenida en una circunferencia
 * (referencia objetivo aprobada), en vez de la cabeza+hombros suelta
 * anterior. Mismo trazo 2px que el resto del sistema.
 */
export function ProfileNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="10" r="2.6" stroke={color} strokeWidth={2} />
      <Path d="M6.8 17.5c0-2.8 2.3-4.8 5.2-4.8s5.2 2 5.2 4.8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Competir -- NAV-1B: corona de laureles reconstruida sobre la referencia
 * objetivo (NAV-1 se veía demasiado pequeña/fragmentada a 24px). Cada rama
 * es un tallo curvo (bottom -> apertura superior) con 4 hojas propias
 * (trazos angulados, más grandes que antes) a lo largo, en vez de trazos
 * sueltos sin tallo continuo -- silueta unificada, mayor presencia
 * horizontal, sin tallo central, sin medalla/trofeo.
 */
export function CompeteNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Tallo izquierdo. */}
      <Path d="M9.5 20c-3.8-1.5-6.3-5.5-6-10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Hojas izquierdas. */}
      <Path
        d="M7.7 18.2 5 17.1M6 15.6 3.2 15M4.6 12.7 1.8 12.5M3.7 9.7 1 9.9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tallo derecho (espejo). */}
      <Path d="M14.5 20c3.8-1.5 6.3-5.5 6-10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Hojas derechas. */}
      <Path
        d="M16.3 18.2 19 17.1M18 15.6 20.8 15M19.4 12.7 22.2 12.5M20.3 9.7 23 9.9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Inicio -- NAV-1: casa simplificada (techo recto + cuerpo rectangular +
 * puerta rectangular), aproximada a la referencia objetivo, sin detalles
 * innecesarios.
 */
export function HomeNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11 12 4l8 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 20v-5h4v5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Estudio -- NAV-1: libro abierto (reemplaza el compás). Geometría propia
 * de `StudyNavIcon`, inspirada conceptualmente en `OpenBookIcon`
 * (`action-icons.tsx`, sin tocarlo ni a sus consumidores): dos páginas
 * simétricas con curva suave que se encuentran en un lomo/eje central
 * marcado por una línea vertical. Lineal, sin relleno, reconocible a 24px.
 */
export function StudyNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 7c-1.6-1.4-3.6-2.1-6.3-2.1v12.6c2.7 0 4.7.7 6.3 2.1 1.6-1.4 3.6-2.1 6.3-2.1V4.9c-2.7 0-4.7.7-6.3 2.1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 7v12.6" stroke={color} strokeWidth={2} strokeLinecap="round" />
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
 * NAV-1 -- ajuste MODERADO de peso óptico exclusivamente para su lectura a
 * 24px en la tab bar, sin tocar geometría/coordenadas (mismos nodos,
 * mismas diagonales, mismo remate): trazo 0.7 -> 1.1, nodos r 0.6 -> 0.85,
 * opacidades subidas (0.72-0.9 -> 0.9-1) para que no se vea "mucho más
 * tenue" que Perfil/Competir/Inicio/Estudio (trazo 2, opacidad 1), sin
 * llegar a igualar su grosor -- el símbolo conserva más densidad
 * geométrica (6 líneas + 4 nodos + remate) y por eso mantiene un trazo más
 * fino que un ícono de 2-3 trazos simples; se busca paridad de PESO
 * ÓPTICO, no de `strokeWidth` numérico. `AiTutorMark`/`tutor-symbol.png`
 * no se ven afectados -- son una implementación completamente aparte
 * (`Image` sobre el PNG oficial), sin ningún código compartido con este
 * componente (confirmado en la auditoría NAV-1).
 *
 * NAV-1B -- ajuste SUTIL de proporción (validación física: se veía corto/
 * achatado horizontalmente frente a la identidad oficial). Izquierda/
 * derecha se acercan al centro (x 5/19 -> 6.5/17.5, ancho 14 -> 11) y el
 * eje vertical se alarga (remate 17.4 -> 18, estrella desplazada +0.6 en
 * y) -- mismos 4 nodos conceptuales, mismas conexiones, mismo remate,
 * mismo `strokeWidth`/opacidad de NAV-1, solo coordenadas.
 *
 * Mismo componente para la tab bar (24px) y, potencialmente, cualquier
 * otro consumidor futuro de `Icon name="ai"` -- hoy solo la tab bar.
 */
export function AiNavIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Eje vertical: nodo superior -> nodo central -> remate. */}
      <Line x1="12" y1="4" x2="12" y2="18" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      {/* Eje horizontal: izquierda -> centro -> derecha (colineales). */}
      <Line x1="6.5" y1="11" x2="17.5" y2="11" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      {/* Diagonales superiores (rombo). */}
      <Line x1="12" y1="4" x2="6.5" y2="11" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      <Line x1="12" y1="4" x2="17.5" y2="11" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      {/* Diagonales inferiores (cierran el rombo hacia el remate). */}
      <Line x1="6.5" y1="11" x2="12" y2="18" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      <Line x1="17.5" y1="11" x2="12" y2="18" stroke={color} strokeWidth={1.1} strokeLinecap="round" opacity={0.95} />
      {/* Nodo superior -- hueco (solo trazo), se integra con la red fina. */}
      <Circle cx="12" cy="4" r="1.1" fill="none" stroke={color} strokeWidth={1.1} opacity={0.95} />
      {/* Izquierda/derecha/centro -- rellenos, pequeños, sin doble contorno. */}
      <Circle cx="6.5" cy="11" r="0.85" fill={color} stroke="none" opacity={0.9} />
      <Circle cx="17.5" cy="11" r="0.85" fill={color} stroke="none" opacity={0.9} />
      <Circle cx="12" cy="11" r="0.85" fill={color} stroke="none" opacity={0.9} />
      {/* Remate: estrella/diamante de 4 puntas, hueca (solo trazo) -- nunca una flecha. */}
      <Path
        d="M12 18 12.4 19.2 13.6 19.6 12.4 20 12 21.2 11.6 20 10.4 19.6 11.6 19.2Z"
        fill="none"
        stroke={color}
        strokeWidth={0.9}
        strokeLinejoin="round"
        opacity={1}
      />
    </Svg>
  );
}
