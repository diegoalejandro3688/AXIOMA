import { Pressable, View } from 'react-native';
import { Text } from '../ui';
import { useTheme, radii, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Navegador compacto de preguntas -- ENSAYOS-M1-C. Grid 1..N que permite
 * saltar a una pregunta y distingue visualmente el estado de cada una.
 * Presentación pura: recibe `states` ya calculados por el llamador
 * (ver `lib/exams/attempt-state.ts`), nunca decide nada.
 *
 * DURANTE el intento: `current | answered | unanswered` (jamás correcta/
 * incorrecta -- eso filtraría la pauta). EN LA REVISIÓN: `current | correct |
 * incorrect | unanswered`.
 */
export type NavigatorCellState = 'current' | 'answered' | 'unanswered' | 'correct' | 'incorrect';

export function ExamQuestionNavigator({
  count,
  states,
  onSelect,
}: {
  count: number;
  /** `states[i]` = estado de la pregunta en posición `i+1`. */
  states: NavigatorCellState[];
  onSelect: (index: number) => void;
}) {
  const tokens = useTheme();
  return (
    <View style={styles.grid} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, index) => {
        const state = states[index] ?? 'unanswered';
        const visual = cellVisual(tokens, state);
        return (
          <Pressable
            key={index}
            accessibilityRole="tab"
            accessibilityLabel={`Ir a la pregunta ${index + 1}, ${cellStateLabel(state)}`}
            accessibilityState={{ selected: state === 'current' }}
            onPress={() => onSelect(index)}
            style={[styles.cell, { backgroundColor: visual.bg, borderColor: visual.border }]}
          >
            <Text variant="caption" weight="semibold" style={{ color: visual.fg }}>
              {index + 1}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function cellStateLabel(state: NavigatorCellState): string {
  switch (state) {
    case 'current':
      return 'pregunta actual';
    case 'answered':
      return 'respondida';
    case 'correct':
      return 'correcta';
    case 'incorrect':
      return 'incorrecta';
    default:
      return 'sin responder';
  }
}

function cellVisual(t: ThemeTokens, state: NavigatorCellState): { bg: string; border: string; fg: string } {
  switch (state) {
    case 'current':
      return { bg: t.color.accent.default, border: t.color.accent.strong, fg: t.color.text.onAccent };
    case 'answered':
      return { bg: t.color.accent.subtleBg, border: t.color.accent.default, fg: t.color.accent.strong };
    case 'correct':
      return { bg: t.color.state.success.background, border: t.color.state.success.border, fg: t.color.state.success.text };
    case 'incorrect':
      return { bg: t.color.state.error.background, border: t.color.state.error.border, fg: t.color.state.error.text };
    default:
      return { bg: t.color.background.surface, border: t.color.border.default, fg: t.color.text.secondary };
  }
}

const styles = {
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.space1,
  },
  cell: {
    width: 34,
    height: 34,
    borderRadius: radii.small,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
