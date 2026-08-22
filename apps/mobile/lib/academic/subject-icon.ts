import type { IconName, ThemeTokens } from '../../theme';

export type SubjectTone = 'accent' | 'success' | 'warning' | null;

/**
 * Resuelve icono/color académico por NOMBRE real de materia (nunca por
 * posición/índice -- el backend puede reordenar o añadir materias). Las 4
 * familias reales confirmadas contra el seed (`apps/backend/prisma/seed.ts`):
 * Matemática/Ciencias/Historia/Lenguaje (NO "Competencia Lectora" -- ese es
 * el nombre de un TEMA dentro de Lenguaje, no de la materia).
 *
 * `theme/tokens.ts` no define familias de color académicas propias
 * (azul/verde/ámbar/violeta) -- solo existen los tokens semánticos ya
 * aprobados (accent/state.*). Se reutilizan por semejanza de matiz donde
 * corresponde (Matemática -> accent = azul; Ciencias -> state.success =
 * verde; Historia -> state.warning = ámbar). Para Lenguaje (violeta) NO
 * existe ningún token de esa familia -- en vez de fabricar un hex nuevo
 * fuera de `theme/tokens.ts`, mantiene el mismo tratamiento de color que
 * Matemática (icono real y distinto, color de familia limitado por el
 * token disponible) -- ver "Materia no mapeada" en el UI-3 Implementation
 * Report.
 *
 * PROFILE-1 -- extraído de `app/(tabs)/estudio/index.tsx` (donde vivía
 * originalmente) a `lib/` para poder reutilizarlo desde
 * `components/profile/academic-summary-section.tsx` sin duplicar la
 * lógica ni importar de un archivo de ruta de otra pantalla.
 */
export function subjectIcon(name: string): { icon: IconName; tone: SubjectTone } {
  switch (name) {
    case 'Matemática':
      return { icon: 'subject-math', tone: 'accent' };
    case 'Ciencias':
      return { icon: 'subject-science', tone: 'success' };
    case 'Historia':
      return { icon: 'subject-history', tone: 'warning' };
    case 'Lenguaje':
      return { icon: 'subject-language', tone: null };
    default:
      return { icon: 'subject-math', tone: null };
  }
}

export function subjectToneColor(t: ThemeTokens, tone: SubjectTone): string {
  if (tone === 'success') return t.color.state.success.text;
  if (tone === 'warning') return t.color.state.warning.text;
  return t.color.accent.strong;
}

export function subjectToneBackground(t: ThemeTokens, tone: SubjectTone): string {
  if (tone === 'success') return t.color.state.success.background;
  if (tone === 'warning') return t.color.state.warning.background;
  return t.color.accent.subtleBg;
}
