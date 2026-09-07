import { CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION } from '@axioma/contracts';

/**
 * PS-0C.2 -- copia V1 de los "Términos de uso y convivencia pública".
 *
 * Corta, clara, seria, adolescente-friendly. NO es un contrato legal
 * corporativo. La VERSIÓN vive en `@axioma/contracts`
 * (`CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION`) -- nunca se duplica un
 * string mágico aquí. La aceptación es obligatoria SÓLO antes de publicar
 * identidad pública; las funciones privadas de aprendizaje siguen
 * disponibles sin aceptar.
 */

export const PUBLIC_PARTICIPATION_TERMS_TITLE = 'Términos de uso y convivencia pública';
export const PUBLIC_PARTICIPATION_TERMS_VERSION = CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION;

export interface TermsSection {
  heading: string;
  body: string;
}

export const PUBLIC_PARTICIPATION_TERMS_INTRO =
  'La participación pública en ZETRYND es opcional. Si decides tener un nombre de usuario visible, ' +
  'aparecer en la Clasificación o mostrar tu perfil a otras personas, aceptas estas reglas. ' +
  'Si prefieres no aceptarlas, puedes seguir usando ZETRYND en privado: estudiar, hacer ensayos y ' +
  'usar el Tutor IA funcionan igual.';

export const PUBLIC_PARTICIPATION_TERMS_SECTIONS: readonly TermsSection[] = [
  {
    heading: 'Elige un nombre de usuario apropiado',
    body:
      'Tu nombre de usuario es visible para otras personas. No uses lenguaje ofensivo, discriminatorio ' +
      'o sexualmente inapropiado, ni referencias a violencia o amenazas.',
  },
  {
    heading: 'No suplantes a nadie',
    body:
      'No te hagas pasar por ZETRYND, por soporte, por moderadores o personal, por instituciones ' +
      '(colegios, DEMRE, universidades) ni por otras personas. No insinúes afiliaciones oficiales que no existen.',
  },
  {
    heading: 'Reporta de buena fe',
    body:
      'Puedes reportar un nombre de usuario o perfil que infrinja estas reglas. Usa el reporte con ' +
      'honestidad: los reportes falsos o masivos también son un mal uso.',
  },
  {
    heading: 'Puedes bloquear a otras personas',
    body:
      'Si no quieres ver a alguien, puedes bloquearlo. Seguirá apareciendo en la Clasificación en su ' +
      'posición real, pero sin su identidad visible para ti. Bloquear no sanciona a la otra persona.',
  },
  {
    heading: 'ZETRYND puede intervenir',
    body:
      'Si un nombre de usuario infringe estas reglas, ZETRYND puede ocultarlo o restablecerlo. En ese ' +
      'caso podrás elegir uno nuevo. Esto no afecta tu progreso, tu nivel, tus puntos ni tu cuenta.',
  },
  {
    heading: 'Participar es opcional',
    body:
      'Puedes hacer privado tu perfil en cualquier momento. Si decides no aceptar estos términos, las ' +
      'funciones privadas de aprendizaje siguen disponibles con normalidad.',
  },
];
