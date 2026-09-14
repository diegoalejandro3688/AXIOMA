import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges } from '../../../lib/api/challenges';
import { challengeSections } from '../../../lib/challenges/select-hub-challenges';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text } from '../../../components/ui';
import { ChallengeRow } from '../../../components/challenges/challenge-row';
import { useChallengeClaim } from '../../../components/challenges/use-challenge-claim';
import { useBoundedReconciliation } from '../../../lib/progress/use-bounded-reconciliation';
import { useThemedStyles, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; challenges: ChallengeSummary[] };

/**
 * DESAFÍOS -- pantalla completa (Competir, Incremento 7). Nueva SUPERFICIE
 * de la funcionalidad ya existente: reutiliza `listChallenges()` (misma
 * colección que el hub) y `useChallengeClaim` (mismo flujo, misma
 * reconciliación) -- cero lógica de claim propia, cero endpoint nuevo.
 *
 * Orden ESTABLE por `challengeKey` ascendente, separado por tipo
 * (`challengeSections`, mismo criterio que la vista previa del hub).
 * COMPLETED y CLAIMED siguen representándose (con tratamiento más
 * silencioso) hasta que el backend deje de devolverlos -- el móvil no
 * introduce reglas de expiración.
 *
 * Solo lista y reclama: nada de estadísticas, pestañas, categorías ni
 * recarga manual. El header nativo (flecha atrás + "Desafíos") lo provee
 * `competir/_layout.tsx`, igual que Ranking.
 */
export default function DesafiosScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setState({ status: 'loading' });
    const result = await listChallenges();
    if (!result.ok) {
      if (!silent) setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', challenges: result.data.challenges });
  }, []);

  const applyClaimed = useCallback((updated: ChallengeSummary) => {
    setState((prev) =>
      prev.status === 'ready' ? { status: 'ready', challenges: prev.challenges.map((c) => (c.id === updated.id ? updated : c)) } : prev,
    );
  }, []);
  const { claimingId, errors: claimErrors, claim, claiming } = useChallengeClaim({ onClaimed: applyClaimed, onReconcile: load });

  useEffect(() => {
    load();
  }, [load]);

  // F1 RELEASE REMEDIATION -- mismo patrón que competir/index.tsx (Polish F,
  // §21/§22): la pantalla vive en el stack de Competir y puede quedar
  // montada mientras el usuario completa una actividad de estudio en otra
  // pestaña -- sin esto, el progreso ya persistido en backend no aparecía
  // hasta reiniciar la app. Recarga silenciosa al recuperar el foco (idempotente,
  // igual criterio que el hub para Liga) + reconciliación acotada compartida.
  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load]),
  );

  const challengeSignature =
    state.status === 'ready' ? state.challenges.map((c) => `${c.id}:${c.progressValue}:${c.challengeStatus}`).join('|') : null;
  const reconcileChallenges = useCallback(() => void load({ silent: true }), [load]);
  useBoundedReconciliation(reconcileChallenges, challengeSignature);

  if (state.status === 'loading') return <LoadingState message="Cargando desafíos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { daily, weekly } = challengeSections(state.challenges);
  const nothing = daily.length === 0 && weekly.length === 0;

  const renderRow = (challenge: ChallengeSummary) => (
    <ChallengeRow
      key={challenge.id}
      variant="full"
      challenge={challenge}
      claiming={claimingId === challenge.id}
      claimDisabled={claiming}
      error={claimErrors[challenge.id]}
      onClaim={() => claim(challenge.id)}
    />
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <Text variant="bodySmall" color="secondary">
        Completa actividades de estudio y reclama XP.
      </Text>

      {nothing ? (
        <View style={styles.emptyCard}>
          <Text variant="bodySmall" color="secondary">
            No hay desafíos disponibles en este momento. Sigue estudiando y aparecerán aquí.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>
              Diarios
            </Text>
            {daily.length > 0 ? (
              daily.map(renderRow)
            ) : (
              <Text variant="bodySmall" color="secondary">
                No tienes desafíos diarios ahora mismo.
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>
              Semanal
            </Text>
            {weekly.length > 0 ? (
              weekly.map(renderRow)
            ) : (
              <Text variant="bodySmall" color="secondary">
                No tienes un desafío semanal ahora mismo.
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    scroll: { flex: 1, backgroundColor: t.color.background.default },
    container: { padding: 16, gap: spacing.space4 },
    section: { gap: spacing.space2 },
    sectionTitle: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    emptyCard: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 16,
      backgroundColor: t.color.background.surface,
      padding: spacing.space4,
    },
  };
}
