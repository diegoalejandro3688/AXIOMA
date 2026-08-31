import { View } from 'react-native';
import type { ChallengeSummary } from '@axioma/contracts';
import { Text, Card, Button, Progress, Icon } from '../ui';
import { useThemedStyles, useTheme, spacing, radii } from '../../theme';
import type { ThemeTokens, IconName } from '../../theme';
import { progressRatio, canClaim } from '../../lib/challenges/group-challenges';
import {
  challengeTypeLabel,
  challengeStatusLabel,
  formatCountdown,
  formatRewardXp,
  claimCtaLabel,
  isPastPeriod,
} from '../../lib/challenges/challenge-card-view';

export type ChallengeRowVariant = 'full' | 'compact';

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
  /**
   * `full` (por defecto): tarjeta completa (lista de Desafíos). `compact`:
   * fila plana para la vista previa del hub Competir -- sin Card propia, con
   * tile de icono e identidad de tipo (DIARIO azul / SEMANAL violeta).
   */
  variant?: ChallengeRowVariant;
}

/**
 * DESAFÍOS -- fila de desafío reutilizable. Una única primitive con dos
 * variantes de densidad; toda la presentación (tipo, progreso, recompensa,
 * cuenta regresiva, estado, CTA) sale de los helpers PUROS ya existentes --
 * este componente solo ensambla. No conoce rutas, navegación ni de qué
 * pantalla lo montan; la lógica de claim vive en `useChallengeClaim`.
 *
 * Ninguna variante expone clasificaciones internas del desafío (el
 * contrato no las trae y son deliberadamente privadas -- DESAFÍOS V1): la
 * fila solo muestra tipo, título, progreso, recompensa, cuenta regresiva y
 * estado.
 */
export function ChallengeRow({ challenge, claiming, claimDisabled, error, onClaim, variant = 'full' }: ChallengeRowProps) {
  return variant === 'compact' ? (
    <CompactChallengeRow challenge={challenge} claiming={claiming} claimDisabled={claimDisabled} error={error} onClaim={onClaim} />
  ) : (
    <FullChallengeRow challenge={challenge} claiming={claiming} claimDisabled={claimDisabled} error={error} onClaim={onClaim} />
  );
}

/** Identidad de tipo -- SOLO acentos, nunca convierte la fila entera en color. DIARIO: azul/cian ZETRYND. SEMANAL: violeta/índigo. */
function typeIdentity(t: ThemeTokens, type: ChallengeSummary['challengeType']): { icon: IconName; accent: string; tileBg: string } {
  if (type === 'WEEKLY') {
    return { icon: 'study-mode-essay', accent: t.color.academic.violet.text, tileBg: t.color.academic.violet.background };
  }
  return { icon: 'study-mode-practice', accent: t.color.accent.default, tileBg: t.color.accent.subtleBg };
}

function FullChallengeRow({ challenge, claiming, claimDisabled, error, onClaim }: Omit<ChallengeRowProps, 'variant'>) {
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

/**
 * Vista previa compacta del hub -- misma arquitectura base que `full` (tipo,
 * título, progreso, X/Y, recompensa, cuenta regresiva, mismo claim), en una
 * fila plana con tile de icono. Sin descripción, sin Card anidada.
 */
function CompactChallengeRow({ challenge, claiming, claimDisabled, error, onClaim }: Omit<ChallengeRowProps, 'variant'>) {
  const styles = useThemedStyles(createStyles);
  const tokens = useTheme();
  const identity = typeIdentity(tokens, challenge.challengeType);
  const countdown = isPastPeriod(challenge) ? null : formatCountdown(challenge.periodEnd);
  const rewardXp = formatRewardXp(challenge.rewardXpBonus);
  const claimed = challenge.challengeStatus === 'CLAIMED';

  return (
    <View style={styles.compactRow}>
      <View style={[styles.compactTile, { backgroundColor: identity.tileBg }]}>
        <Icon name={identity.icon} size={18} color={identity.accent} />
      </View>

      <View style={styles.compactBody}>
        <View style={styles.compactTopLine}>
          <Text variant="micro" weight="bold" style={[styles.compactType, { color: identity.accent }]}>
            {challengeTypeLabel(challenge.challengeType).toUpperCase()}
          </Text>
          {rewardXp ? (
            <Text variant="micro" weight="bold" color="primary">
              {rewardXp}
            </Text>
          ) : null}
        </View>

        <Text variant="titleMedium" weight="semibold" numberOfLines={1}>
          {challenge.name}
        </Text>

        <Progress value={progressRatio(challenge)} accessibilityLabel={`Progreso: ${challenge.progressValue} de ${challenge.targetValue}`} />

        <View style={styles.compactMetaRow}>
          <Text variant="caption" color="muted">
            {challenge.progressValue}/{challenge.targetValue} actividades
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

        {claimed ? (
          <View style={styles.compactClaimed}>
            <Icon name="check" size={13} color="muted" />
            <Text variant="caption" color="muted">
              Completado
            </Text>
          </View>
        ) : canClaim(challenge) ? (
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
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    // --- full ---
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
    claimButton: { marginTop: spacing.space2, alignSelf: 'flex-start' as const },
    // --- compact ---
    compactRow: { flexDirection: 'row' as const, gap: spacing.space3, paddingVertical: spacing.space2 },
    compactTile: {
      width: 34,
      height: 34,
      borderRadius: radii.medium,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    compactBody: { flex: 1, gap: 4 },
    compactTopLine: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    compactType: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    compactMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    compactClaimed: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 2 },
  };
}
