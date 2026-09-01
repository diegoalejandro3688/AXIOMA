import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * INICIO Increment 1.1 -- ilustración decorativa del card "Continuar
 * estudiando". Reemplaza `home-math-illustration.tsx` (compás + reglas), que
 * leía como algo específico de Matemática.
 *
 * Concepto: "red geométrica de conocimiento" -- nodos conectados por líneas
 * finas + arcos orbitales + un fragmento de retícula. Abstracta y
 * SUBJECT-NEUTRAL: no evoca ninguna materia concreta (funciona igual para
 * Matemática M1/M2, Lenguaje, Ciencias, Historia). Sin texto, sin iconos de
 * recompensa/competición, sin personajes.
 *
 * Puramente visual: `pointerEvents="none"`, sin nodo de accesibilidad, un
 * solo `react-native-svg` (no es un icono del registro semántico). Se monta
 * como PRIMER hijo del card y queda por DEBAJO del texto/CTA por orden de
 * render. Trazo monocromático `accent.default` sobre la superficie fija
 * `background.inverse` del `Card variant="brand"` -> se comporta igual en
 * claro y oscuro (la superficie del card no depende del tema).
 *
 * Composición: masa concentrada abajo-a-la-derecha, recortada
 * intencionalmente por el borde del card (`right/bottom` negativos). Las
 * líneas densas quedan en la mitad inferior; sólo trazos finos y tenues
 * suben hacia el espacio vacío. La columna de texto (izquierda-arriba)
 * queda limpia.
 */
export function HomeKnowledgeIllustration() {
  const tokens = useTheme();
  const stroke = tokens.color.accent.default;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: -30, bottom: -28, width: 184, height: 184, opacity: 0.24 }}
    >
      <Svg width={184} height={184} viewBox="0 0 184 184" fill="none">
        {/* Arco orbital exterior -- anillo parcial anclado abajo-derecha */}
        <Path
          d="M176 78a76 76 0 1 1-104-32"
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinecap="round"
          opacity={0.45}
        />
        {/* Arco orbital interior */}
        <Path
          d="M152 116a36 36 0 0 1-58 28"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Aristas de la red de conocimiento */}
        <Line x1="60" y1="60" x2="106" y2="88" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
        <Line x1="106" y1="88" x2="150" y2="72" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
        <Line x1="106" y1="88" x2="132" y2="132" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
        <Line x1="132" y1="132" x2="150" y2="72" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        <Line x1="132" y1="132" x2="88" y2="150" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />

        {/* Nodos -- uno central mayor (hub), el resto menores */}
        <Circle cx="60" cy="60" r="3" stroke={stroke} strokeWidth={1.5} />
        <Circle cx="106" cy="88" r="4.5" fill={stroke} />
        <Circle cx="150" cy="72" r="3" stroke={stroke} strokeWidth={1.5} />
        <Circle cx="132" cy="132" r="3.5" stroke={stroke} strokeWidth={1.5} />
        <Circle cx="88" cy="150" r="2.5" fill={stroke} />

        {/* Fragmento de retícula -- esquina superior derecha, muy tenue */}
        <Line x1="150" y1="20" x2="150" y2="44" stroke={stroke} strokeWidth={1.25} strokeLinecap="round" opacity={0.28} />
        <Line x1="138" y1="32" x2="172" y2="32" stroke={stroke} strokeWidth={1.25} strokeLinecap="round" opacity={0.28} />
      </Svg>
    </View>
  );
}
