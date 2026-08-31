import { View } from 'react-native';
import type { ChallengeSummary } from '@axioma/contracts';
import { Text, Card, Button, Progress } from '../ui';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { progressRatio, canClaim } from '../../lib/challenges/group-challenges';
import {
  challengeTypeLabel,
  challengeStatusLabel,
  formatCountdown,
  formatRewardXp,
  claimCtaLabel,
  isPastPeriod,
} from '../../lib/challenges/challenge-card-view';

export interface ChallengeRowProps {
  challenge: ChallengeSummary;
  /** `true` si el claim de ESTE desafío está en curso. */
  claiming: boolean;
  /** `true` si hay CUALQUIER claim en curso -- deshabilita el botón de este (igual que antes). */
  claimDisabled: boolean;
  /** Mensaje de error localizado del último intento de claim de este desafío, si lo hay. */
  error?: string;
  /** El componente no navega ni conoce rutas -- solo dispara este callback. */
  onClaim: () => void;
}

/**
 * DESAFÍOS -- fila de desafío reutilizable, extraída SIN cambios visuales
 * de `competir/index.tsx` (Bloque III, sub-incremento 4.d). Toda la
 * presentación (tipo, progreso, recompensa, cuenta regresiva, estado, CTA)
 * sale de los helpers PUROS ya existentes -- este componente solo ensambla.
 * No conoce rutas, navegación ni de qué pantalla lo montan; la lógica de
 * claim vive en `useChallengeClaim`.
 */
export function ChallengeRow({ challenge, claiming, claimDisabled, error, onClaim }: ChallengeRowProps) {
  const styles = useThemedStyles(createStyles);
  const countdown = isPastPeriod(challenge) ? null : formatCountdown(challenge.periodEnd);
  const rewardXp = formatRewardXp(challenge.rewardXpBonus);

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          {challenge.name}
        </Text>
        <Text variant="caption" color="secondary" style={styles.badge}>
          {challengeTypeLabel(challenge.challengeType)}
        </Text>
      </View>
      {challenge.description ? (
        <Text variant="bodySmall" color="secondary">
          {challenge.description}
        </Text>
      ) : null}

      {rewardXp ? (
        <Text variant="label" color="primary">
          Recompensa: {rewardXp}
        </Text>
      ) : null}

      <Progress value={progressRatio(challenge)} accessibilityLabel={`Progreso: ${challenge.progressValue} de ${challenge.targetValue}`} />
      <Text variant="caption" color="muted">
        {challenge.progressValue}/{challenge.targetValue}
      </Text>

      <View style={styles.metaRow}>
        <Text variant="label" color="secondary">
          {challengeStatusLabel(challenge.challengeStatus)}
        </Text>
        {countdown ? (
          <Text variant="caption" color="muted">
            {countdown}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text variant="bodySmall" color="error">
          {error}
        </Text>
      ) : null}

      {canClaim(challenge) ? (
        <Button
          label={claimCtaLabel(challenge.rewardXpBonus)}
          accessibilityLabel={`Reclamar recompensa de ${challenge.name}`}
          onPress={onClaim}
          loading={claiming}
          disabled={claimDisabled}
          variant="primary"
          size="small"
          style={styles.claimButton}
        />
      ) : null}
    </Card>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: { gap: spacing.space2, marginBottom: spacing.space3 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    title: { flex: 1 },
    badge: {
      textTransform: 'uppercase' as const,
      backgroundColor: t.color.accent.subtleBg,
      color: t.color.accent.default,
      borderRadius: 6,
      paddingHorizontal: spacing.space2,
      paddingVertical: 2,
      overflow: 'hidden' as const,
    },
    metaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    claimButton: { marginTop: spacing.space2 },
  };
}
