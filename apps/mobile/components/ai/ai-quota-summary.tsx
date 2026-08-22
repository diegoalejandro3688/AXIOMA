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

  /**
   * AI-1C -- "dato protagonista" compacto: `remaining`/`limit` (campos
   * reales del backend, sin recalcular nada) como número destacado, con
   * `describeDailyQuota(dailyQuota)` conservado como `accessibilityLabel`
   * (misma llamada real que antes -- ver `verify-ai-mobile-gate.ts`, exige
   * este substring literal). La explicación ("consultas disponibles hoy")
   * es el mismo copy que ya usaba `describeDailyQuota`, solo separado en su
   * propia línea; el reset queda terciario/muted. Mismo criterio de
   * `exhausted` que ya existía (AI-1A) para reflejar el único estado
   * especial real del contrato (cuota agotada, `remaining <= 0` -- no hay
   * ningún otro estado/campo de "ilimitado" en `AiDailyQuotaResponse`).
   */
  return (
    <View style={styles.container}>
      <Text
        style={[styles.bigNumber, exhausted && styles.bigNumberWarning]}
        accessibilityLabel={`Cuota diaria: ${describeDailyQuota(dailyQuota)}`}
      >
        {dailyQuota.remaining} / {dailyQuota.limit}
      </Text>
      <Text style={[styles.explain, exhausted && styles.explainWarning]}>consultas disponibles hoy</Text>
      {typeof turnCount === 'number' && typeof maxTurns === 'number' ? (
        <Text style={styles.line}>{describeTurns(turnCount, maxTurns)}</Text>
      ) : null}
      <Text style={styles.reset}>Se renueva {describeResetAt(dailyQuota.resetAt)}</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { alignItems: 'center' as const, gap: 2 },
    bigNumber: { fontSize: 20, fontWeight: '700' as const, color: t.color.text.primary },
    bigNumberWarning: { color: t.color.state.warning.text },
    explain: { fontSize: 12, color: t.color.text.secondary },
    explainWarning: { color: t.color.state.warning.text, fontWeight: '600' as const },
    line: { fontSize: 12, color: t.color.text.secondary },
    reset: { fontSize: 11, color: t.color.text.muted },
  };
}
