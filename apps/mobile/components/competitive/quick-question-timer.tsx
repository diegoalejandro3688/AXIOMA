import { View } from 'react-native';
import { Text, Icon } from '../ui';
import { useTheme, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { formatTimerSeconds, timerLevel, type TimerLevel } from '../../lib/quick-question/quick-question-feedback';

export interface QuickQuestionTimerProps {
  /** Segundos restantes (no negativo). El llamador ya lo congela al responder. */
  secondsRemaining: number;
  /** `true` cuando el conteo está detenido (respuesta enviada / feedback) -- se atenúa el pill. */
  frozen?: boolean;
}

/**
 * PREGUNTA RÁPIDA (Incremento 8) -- pill compacta del temporizador VISUAL,
 * esquina superior derecha. Ancho estable (`minWidth`) para no provocar
 * layout shift al bajar de "45 s" a "9 s". Progresión de urgencia por
 * tokens del tema: normal (gris/azul sutil) -> atención (aviso) -> urgencia
 * (coral/rojo controlado). Sin animaciones, sin parpadeo, sin sonido.
 *
 * SOLO presentación local -- el límite de 45 s no tiene autoridad de
 * servidor en el Incremento 8 (ver `quick-question-feedback.ts`).
 */
export function QuickQuestionTimer({ secondsRemaining, frozen = false }: QuickQuestionTimerProps) {
  const tokens = useTheme();
  const level = timerLevel(secondsRemaining);
  const palette = levelPalette(tokens, level);

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={`Tiempo restante: ${formatTimerSeconds(secondsRemaining)}`}
      style={{
        alignSelf: 'flex-end',
        minWidth: 74,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        paddingVertical: 4,
        paddingHorizontal: 12,
        opacity: frozen ? 0.55 : 1,
      }}
    >
      {/* Icono de reloj subordinado al número -- vectorial del registro del proyecto. */}
      <Icon name="clock" size={13} color={palette.text} />
      <Text variant="label" weight="bold" style={{ color: palette.text, fontVariant: ['tabular-nums'] }}>
        {formatTimerSeconds(secondsRemaining)}
      </Text>
    </View>
  );
}

function levelPalette(t: ThemeTokens, level: TimerLevel): { text: string; background: string; border: string } {
  switch (level) {
    case 'attention':
      return { text: t.color.state.warning.text, background: t.color.state.warning.background, border: t.color.state.warning.border };
    case 'urgent':
    case 'expired':
      return { text: t.color.state.error.text, background: t.color.state.error.background, border: t.color.state.error.border };
    default:
      return { text: t.color.text.secondary, background: t.color.background.surface, border: t.color.border.default };
  }
}
