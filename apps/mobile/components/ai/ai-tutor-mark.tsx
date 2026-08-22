import { Image, View } from 'react-native';
import tutorSymbolAsset from '../../assets/ai/tutor-symbol.png';

/**
 * AI-1J -- marca oficial del hero de Tutor Home. Tras el ciclo AI-1D -> AI-1I
 * de reconstrucción procedural (SVG: nodos, mallas, elipses tipo "globo de
 * alambre"), se abandona la aproximación por primitivas: el asset PNG
 * aprobado (`assets/ai/tutor-symbol.png`) ES la fuente de verdad visual y se
 * renderiza tal cual, sin redibujar, reinterpretar ni recolorear nada.
 *
 * Componente reducido a un wrapper presentacional: dimensiona el contenedor
 * y delega el render en `Image` (`resizeMode="contain"`, preserva la
 * relación de aspecto 1:1 del asset, sin deformarlo). El tamaño del
 * contenedor conserva la misma relación (`size * 2.3`) que usaba el
 * `ringBox` de la reconstrucción procedural anterior, para no alterar el
 * espacio que ya ocupaba en el Home (congelado, sin tocar `index.tsx`).
 *
 * Exclusivo del hero -- la tab bar sigue usando únicamente `AiNavIcon`
 * (`theme/icons/nav-icons.tsx`, sin tocar en este incremento).
 */
export function AiTutorMark({ size = 104 }: { size?: number }) {
  const box = size * 2.3;

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={tutorSymbolAsset}
        style={{ width: box, height: box }}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}
