import type { IconName, ThemeTokens } from '../../theme';

export type SubjectTone = 'accent' | 'success' | 'warning' | 'violet' | null;

/**
 * Resuelve icono/color académico por NOMBRE real de materia (nunca por
 * posición/índice -- el backend puede reordenar o añadir materias). Las 4
 * familias reales confirmadas contra el seed (`apps/backend/prisma/seed.ts`):
 * Matemática/Ciencias/Historia/Lenguaje (NO "Competencia Lectora" -- ese es
 * el nombre de un TEMA dentro de Lenguaje, no de la materia).
 *
 * `theme/tokens.ts` reutiliza tokens semánticos ya aprobados donde el matiz
 * coincide (Matemática -> accent = azul; Ciencias -> state.success = verde;
 * Historia -> state.warning = ámbar) y, desde STUDY-2A, una familia
 * académica dedicada `color.academic.violet` para Lenguaje -- antes cubierto
 * por `null` (caía en accent/azul, el mismo tono que Matemática; ver
 * "Materia no mapeada" en el UI-3 Implementation Report, ya resuelto).
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
      return { icon: 'subject-language', tone: 'violet' };
    default:
      return { icon: 'subject-math', tone: null };
  }
}

export function subjectToneColor(t: ThemeTokens, tone: SubjectTone): string {
  if (tone === 'success') return t.color.state.success.text;
  if (tone === 'warning') return t.color.state.warning.text;
  if (tone === 'violet') return t.color.academic.violet.text;
  return t.color.accent.strong;
}

export function subjectToneBackground(t: ThemeTokens, tone: SubjectTone): string {
  if (tone === 'success') return t.color.state.success.background;
  if (tone === 'warning') return t.color.state.warning.background;
  if (tone === 'violet') return t.color.academic.violet.background;
  return t.color.accent.subtleBg;
}
