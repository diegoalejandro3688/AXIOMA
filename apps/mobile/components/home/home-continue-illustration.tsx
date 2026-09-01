import { Image, View } from 'react-native';
import { HomeKnowledgeIllustration } from './home-knowledge-illustration';
import homeMath from '../../assets/home/home-math.webp';

/**
 * INICIO -- ilustración decorativa del card "Continuar estudiando",
 * DEPENDIENTE de la materia del destino.
 *
 * PROTOTIPO (solo Matemática): si el destino pertenece a Matemática M1
 * (`subjectKey === 'matematica'`) o M2 (`'matematica-m2'`), se pinta el
 * asset propio de Matemática (`assets/home/home-math.webp`, 1024x1024 RGBA
 * con transparencia real). Para CUALQUIER otra materia -- y para los
 * estados sin materia (all-completed / no-content / no disponible) -- se
 * mantiene la ilustración neutra aprobada `HomeKnowledgeIllustration`.
 *
 * REGLA: el texto SIEMPRE gana. El asset va en la capa de fondo (primer
 * hijo del card), `pointerEvents="none"`, sin nodo de accesibilidad, sesgado
 * a la esquina inferior-derecha y recortado por el borde del card
 * (`overflow: 'hidden'` del `continueCard`). Opacidad baja: es un render a
 * color muy saturado, así que arranca por debajo del rango típico de una
 * línea-art (~0.16) para no competir con kicker / título / CTA. Ajuste fino
 * de posición/opacidad -> QA físico.
 *
 * `subjectKey` es la identidad CANÓNICA estable de la materia (contrato
 * `SubjectResponse`, seed `matematica` / `matematica-m2`), nunca el nombre
 * visible ni el id aleatorio.
 */
const MATH_SUBJECT_KEYS = new Set(['matematica', 'matematica-m2']);

export function HomeContinueIllustration({ subjectKey }: { subjectKey: string | null }) {
  if (subjectKey !== null && MATH_SUBJECT_KEYS.has(subjectKey)) {
    return (
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: -64, bottom: -48, width: 208, height: 208, opacity: 0.16 }}
      >
        <Image source={homeMath} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessible={false} />
      </View>
    );
  }
  return <HomeKnowledgeIllustration />;
}
