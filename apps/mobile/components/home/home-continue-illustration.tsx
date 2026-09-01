import { Image, View } from 'react-native';
import { HomeKnowledgeIllustration } from './home-knowledge-illustration';
import homeMath from '../../assets/home/home-math.webp';
import homeLanguage from '../../assets/home/home-language.webp';
import homeHistory from '../../assets/home/home-history.webp';

/**
 * INICIO -- tratamiento visual del card "Continuar estudiando" DEPENDIENTE de
 * la materia del destino: ilustración de fondo + (Lenguaje/Historia) un
 * tinte profundo de superficie para dar identidad de materia sin salir de la
 * familia visual de ZETRYND.
 *
 * `continuationVisualFor(subjectKey)` es la ÚNICA fuente de verdad -- la usan
 * tanto este componente (artwork + opacidad) como `index.tsx` (fondo local
 * del card). Devuelve `cardBackground: null` para NO tocar el navy de marca
 * (`Card variant="brand"`): Matemática, Ciencias y los estados sin materia.
 *
 * Assets (`assets/home/*.webp`, 1024x1024 RGBA con transparencia real; no se
 * convierten ni se recomprimen):
 *   - Matemática M1 (`'matematica'`) y M2 (`'matematica-m2'`) -> `home-math.webp`
 *     (APPROVED/CLOSED -- opacidad 0.16, superficie navy actual, sin cambios)
 *   - Lenguaje (`'lenguaje'`) -> `home-language.webp` + superficie ciruela/vino profunda
 *   - Historia (`'historia'`) -> `home-history.webp` + superficie sepia/café profunda
 *   - Ciencias (`'ciencias'`), materia desconocida, y los estados SIN materia
 *     (all-completed / no-content / no disponible -> `subjectKey === null`)
 *     -> ilustración neutra aprobada `HomeKnowledgeIllustration`, superficie navy.
 *
 * REGLA de jerarquía: 1) texto  2) CTA  3) jerarquía del card  4) artwork.
 * El asset va en la capa de FONDO (primer hijo del card), `pointerEvents="none"`,
 * sin nodo de accesibilidad, sesgado abajo-derecha y recortado por el borde
 * (`overflow: 'hidden'` del `continueCard`). Debe reconocerse la ilustración
 * sin "buscarla", pero la lectura gana de inmediato. Ajuste fino de
 * opacidad/posición -> QA físico Samsung.
 *
 * COLOR: no hay token global que encaje para una superficie de marca
 * invariante-al-tema en ciruela/sepia; añadir un token global para dos cards
 * no se justifica -> hex LOCAL en esta pantalla (mismo criterio que el hex
 * fijo de `LevelBadge`). Contraste con `text.onInverse` (#F5F6F8) ~15:1,
 * equivalente al navy actual (#04203D). El CTA tiene su propio fondo sólido
 * (`accent.default`), no depende de la superficie del card -> no se toca.
 *
 * `subjectKey` es la identidad CANÓNICA estable de la materia (contrato
 * `SubjectResponse`, seed `matematica` / `matematica-m2` / `lenguaje` /
 * `ciencias` / `historia`), nunca el nombre visible ni el id aleatorio.
 */

/** Superficie profunda de marca para Lenguaje -- ciruela/vino, no saturada, invariante al tema. */
const CARD_SURFACE_LANGUAGE = '#2A1526';
/** Superficie profunda de marca para Historia -- sepia/café cálido, no amarillento, invariante al tema. */
const CARD_SURFACE_HISTORY = '#2A2015';

export interface ContinuationVisual {
  /** Módulo de imagen (Metro) del artwork, o `null` -> ilustración neutra. */
  artwork: number | null;
  /** Opacidad de la capa de artwork (ignorada si `artwork === null`). */
  opacity: number;
  /** Fondo local del `continueCard`, o `null` -> conservar el navy de `Card variant="brand"`. */
  cardBackground: string | null;
}

export function continuationVisualFor(subjectKey: string | null): ContinuationVisual {
  switch (subjectKey) {
    case 'matematica':
    case 'matematica-m2':
      // APPROVED/CLOSED -- exactamente igual que antes.
      return { artwork: homeMath, opacity: 0.16, cardBackground: null };
    case 'lenguaje':
      return { artwork: homeLanguage, opacity: 0.3, cardBackground: CARD_SURFACE_LANGUAGE };
    case 'historia':
      return { artwork: homeHistory, opacity: 0.28, cardBackground: CARD_SURFACE_HISTORY };
    default:
      // ciencias / desconocida / null -> fallback neutro, navy actual.
      return { artwork: null, opacity: 0, cardBackground: null };
  }
}

export function HomeContinueIllustration({ subjectKey }: { subjectKey: string | null }) {
  const { artwork, opacity } = continuationVisualFor(subjectKey);
  if (artwork !== null) {
    return (
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: -64, bottom: -48, width: 208, height: 208, opacity }}
      >
        <Image source={artwork} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessible={false} />
      </View>
    );
  }
  return <HomeKnowledgeIllustration />;
}
