import { StyleSheet, View } from 'react-native';
import type { ChallengeSummary } from '@axioma/contracts';
import { Text, Card, Button, Progress, Icon } from '../ui';
import { useTheme, spacing, radii } from '../../theme';
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
   * `full` (por defecto): fila con más aire para la pantalla completa
   * (Card, descripción, título a 2 líneas). `compact`: fila plana para la
   * vista previa del hub. MISMA primitive, misma arquitectura -- solo
   * cambian densidad y envoltorio.
   */
  variant?: ChallengeRowVariant;
}

/** Identidad de tipo -- SOLO acentos, nunca convierte la fila entera en color. DIARIO: azul/cian ZETRYND. SEMANAL: violeta/índigo. */
function typeIdentity(t: ThemeTokens, type: ChallengeSummary['challengeType']): { icon: IconName; accent: string; tileBg: string } {
  if (type === 'WEEKLY') {
    return { icon: 'study-mode-essay', accent: t.color.academic.violet.text, tileBg: t.color.academic.violet.background };
  }
  return { icon: 'study-mode-practice', accent: t.color.accent.default, tileBg: t.color.accent.subtleBg };
}

/**
 * DESAFÍOS -- fila de desafío reutilizable. Una única primitive con dos
 * densidades (`full` / `compact`); toda la presentación (tipo, progreso,
 * recompensa, cuenta regresiva, estado, CTA) sale de los helpers PUROS ya
 * existentes -- este componente solo ensambla. No conoce rutas, navegación
 * ni de qué pantalla lo montan; la lógica de claim vive en
 * `useChallengeClaim`.
 *
 * Ninguna variante expone clasificaciones internas del desafío (el contrato
 * no las trae y son deliberadamente privadas -- DESAFÍOS V1): solo tipo,
 * título, progreso, recompensa, cuenta regresiva y estado de reclamación.
 */
export function ChallengeRow({ challenge, claiming, claimDisabled, error, onClaim, variant = 'full' }: ChallengeRowProps) {
  const tokens = useTheme();
  const compact = variant === 'compact';
  const identity = typeIdentity(tokens, challenge.challengeType);
  const countdown = isPastPeriod(challenge) ? null : formatCountdown(challenge.periodEnd);
  const rewardXp = formatRewardXp(challenge.rewardXpBonus);
  const claimed = challenge.challengeStatus === 'CLAIMED';
  const claimable = canClaim(challenge);
  // Pista de estado SOLO para los estados sin afordancia propia -- COMPLETED
  // tiene su botón, CLAIMED su "✓ Completado".
  const showStatusHint = !compact && !claimed && !claimable;

  const body = (
    <View style={styles.row}>
      <View style={[compact ? styles.tileSm : styles.tileLg, { backgroundColor: identity.tileBg }]}>
        <Icon name={identity.icon} size={compact ? 18 : 20} color={identity.accent} />
      </View>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text variant="micro" weight="bold" style={[styles.type, { color: identity.accent }]}>
            {challengeTypeLabel(challenge.challengeType).toUpperCase()}
          </Text>
          {rewardXp ? (
            <Text variant="micro" weight="bold" color="primary">
              {rewardXp}
            </Text>
          ) : null}
        </View>

        <Text variant="titleMedium" weight="semibold" numberOfLines={compact ? 1 : 2}>
          {challenge.name}
        </Text>

        {!compact && challenge.description ? (
          <Text variant="bodySmall" color="secondary">
            {challenge.description}
          </Text>
        ) : null}

        <Progress value={progressRatio(challenge)} accessibilityLabel={`Progreso: ${challenge.progressValue} de ${challenge.targetValue}`} />

        <View style={styles.metaRow}>
          <Text variant="caption" color="muted">
            {challenge.progressValue}/{challenge.targetValue} actividades
          </Text>
          {countdown ? (
            <Text variant="caption" color="muted">
              {countdown}
            </Text>
          ) : null}
        </View>

        {showStatusHint ? (
          <Text variant="micro" color="muted">
            {challengeStatusLabel(challenge.challengeStatus)}
          </Text>
        ) : null}

        {error ? (
          <Text variant="bodySmall" color="error">
            {error}
          </Text>
        ) : null}

        {claimed ? (
          <View style={styles.claimed}>
            <Icon name="check" size={13} color="muted" />
            <Text variant="caption" color="muted">
              Completado
            </Text>
          </View>
        ) : claimable ? (
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

  return compact ? body : <Card variant="outlined">{body}</Card>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.space3, paddingVertical: spacing.space2 },
  tileSm: { width: 34, height: 34, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  tileLg: { width: 40, height: 40, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2 },
  type: { textTransform: 'uppercase', letterSpacing: 0.6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2 },
  claimed: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  claimButton: { marginTop: spacing.space2, alignSelf: 'flex-start' },
});
