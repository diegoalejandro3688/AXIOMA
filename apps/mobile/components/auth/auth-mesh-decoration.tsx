import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * AUTH-1A -- textura geométrica extremadamente sutil de fondo para
 * Login/Registro (nunca interactiva, nunca protagonista). Componente
 * LOCAL e INDEPENDIENTE de la superficie Auth: no reutiliza ni modifica
 * `AiTutorMark`/`tutor-symbol.png` ni ningún archivo del Tutor IA
 * (congelado, cierres `64465ff`/`2cbb540`). No reproduce matemáticamente la
 * red de la captura de referencia -- conserva únicamente su función visual
 * (nodos + conexiones finas, opacidad muy baja).
 *
 * Se posiciona como fondo absoluto detrás del contenido de la pantalla
 * (primer hijo del contenedor raíz); `pointerEvents="none"` para no
 * interceptar ningún toque. Un solo token (`border.default`) para todo el
 * trazo/relleno -- cero hex nuevo.
 */
export function AuthMeshDecoration() {
  const tokens = useTheme();
  const color = tokens.color.border.default;

  const nodes = [
    { x: 40, y: 60 },
    { x: 130, y: 30 },
    { x: 60, y: 140 },
    { x: 300, y: 90 },
    { x: 340, y: 180 },
    { x: 230, y: 50 },
    { x: 90, y: 230 },
    { x: 20, y: 320 },
    { x: 330, y: 340 },
    { x: 250, y: 400 },
    { x: 120, y: 420 },
    { x: 360, y: 460 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 5],
    [3, 4],
    [3, 5],
    [2, 6],
    [6, 7],
    [8, 9],
    [9, 10],
    [4, 8],
  ];

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520 }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 380 520" preserveAspectRatio="xMidYMin slice">
        {edges.map(([a, b], i) => (
          <Line
            key={`edge-${i}`}
            x1={nodes[a]!.x}
            y1={nodes[a]!.y}
            x2={nodes[b]!.x}
            y2={nodes[b]!.y}
            stroke={color}
            strokeWidth={1}
            opacity={0.25}
          />
        ))}
        {nodes.map((n, i) => (
          <Circle key={`node-${i}`} cx={n.x} cy={n.y} r={i % 3 === 0 ? 3 : 2} fill={color} opacity={i % 3 === 0 ? 0.35 : 0.22} />
        ))}
      </Svg>
    </View>
  );
}
