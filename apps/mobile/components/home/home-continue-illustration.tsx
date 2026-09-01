import { Image, View } from 'react-native';
import { HomeKnowledgeIllustration } from './home-knowledge-illustration';
import homeMath from '../../assets/home/home-math.webp';
import homeLanguage from '../../assets/home/home-language.webp';
import homeHistory from '../../assets/home/home-history.webp';

/**
 * INICIO -- ilustración decorativa del card "Continuar estudiando",
 * DEPENDIENTE de la materia del destino.
 *
 * Assets por materia (`assets/home/*.webp`, 1024x1024 RGBA con transparencia
 * real):
 *   - Matemática M1 (`subjectKey === 'matematica'`) y M2 (`'matematica-m2'`) -> `home-math.webp`
 *   - Lenguaje (`'lenguaje'`)  -> `home-language.webp`
 *   - Historia (`'historia'`) -> `home-history.webp`
 *   - Ciencias (`'ciencias'`), materia desconocida, y los estados SIN materia
 *     (all-completed / no-content / no disponible -> `subjectKey === null`)
 *     -> ilustración neutra aprobada `HomeKnowledgeIllustration`.
 *
 * REGLA: el texto SIEMPRE gana. El asset va en la capa de fondo (primer hijo
 * del card), `pointerEvents="none"`, sin nodo de accesibilidad, sesgado a la
 * esquina inferior-derecha y recortado por el borde del card
 * (`overflow: 'hidden'` del `continueCard`). Opacidad baja y uniforme para
 * las 3 materias (~0.16): son renders a color, atmosféricos, nunca compiten
 * con kicker / título / CTA. Ajuste fino de posición/opacidad -> QA físico.
 *
 * `subjectKey` es la identidad CANÓNICA estable de la materia (contrato
 * `SubjectResponse`, seed `matematica` / `matematica-m2` / `lenguaje` /
 * `ciencias` / `historia`), nunca el nombre visible ni el id aleatorio.
 */
function artworkFor(subjectKey: string | null): number | null {
  switch (subjectKey) {
    case 'matematica':
    case 'matematica-m2':
      return homeMath;
    case 'lenguaje':
      return homeLanguage;
    case 'historia':
      return homeHistory;
    default:
      return null; // ciencias / desconocida / null -> fallback neutro
  }
}

export function HomeContinueIllustration({ subjectKey }: { subjectKey: string | null }) {
  const artwork = artworkFor(subjectKey);
  if (artwork !== null) {
    return (
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: -64, bottom: -48, width: 208, height: 208, opacity: 0.16 }}
      >
        <Image source={artwork} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessible={false} />
      </View>
    );
  }
  return <HomeKnowledgeIllustration />;
}
