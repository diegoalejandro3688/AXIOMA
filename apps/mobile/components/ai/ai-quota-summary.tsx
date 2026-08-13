import { Text, View } from 'react-native';
import type { AiDailyQuotaResponse } from '@axioma/contracts';
import { describeDailyQuota, describeResetAt, describeTurns } from '../../lib/ai/conversation-availability';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Cuota diaria y turnos, renderizados EXCLUSIVAMENTE con los valores que
 * devolvió el backend (`dailyQuota.limit/consumed/remaining/resetAt`,
 * `turnCount`/`maxTurns`) -- ningún número de plan vive en mobile. Se
 * presentan como dos indicadores SEPARADOS porque son mecanismos
 * independientes (invariante 10 del bloque): agotar uno no afecta al otro.
 *
 * Sin ninguna referencia a precio, plan, upgrade ni monetización (decisión L:
 * "sin exponer dólares al estudiante"; el flujo comercial está fuera de todo
 * este bloque).
 */
export function AiQuotaSummary({
  dailyQuota,
  turnCount,
  maxTurns,
}: {
  dailyQuota: AiDailyQuotaResponse;
  turnCount?: number;
  maxTurns?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const exhausted = dailyQuota.remaining <= 0;

  return (
    <View style={styles.container}>
      <View style={[styles.chip, exhausted ? styles.chipWarning : styles.chipNeutral]}>
        <Text style={[styles.chipText, exhausted && styles.chipTextWarning]} accessibilityLabel={`Cuota diaria: ${describeDailyQuota(dailyQuota)}`}>
          {describeDailyQuota(dailyQuota)}
        </Text>
      </View>
      {typeof turnCount === 'number' && typeof maxTurns === 'number' ? (
        <View style={[styles.chip, styles.chipNeutral]}>
          <Text style={styles.chipText}>{describeTurns(turnCount, maxTurns)}</Text>
        </View>
      ) : null}
      <Text style={styles.reset}>Se renueva {describeResetAt(dailyQuota.resetAt)}</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 8 },
    chip: { borderRadius: 999, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10 },
    chipNeutral: { backgroundColor: t.color.background.surface, borderColor: t.color.border.default },
    chipWarning: { backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border },
    chipText: { fontSize: 12, color: t.color.text.secondary },
    chipTextWarning: { color: t.color.state.warning.text, fontWeight: '600' as const },
    reset: { fontSize: 12, color: t.color.text.muted },
  };
}
