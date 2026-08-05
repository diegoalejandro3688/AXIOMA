import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../lib/api/challenges';
import { groupChallenges, progressRatio, canClaim } from '../../lib/challenges/group-challenges';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { EmptyState } from '../../components/empty-state';
import { useTheme, useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; challenges: ChallengeSummary[] };

const STATUS_LABEL: Record<ChallengeSummary['challengeStatus'], string> = {
  ACCEPTED: 'Por empezar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado -- reclama tu recompensa',
  CLAIMED: 'Reclamado',
};

/**
 * Competir -- ver Master Context §4.10 ("Competir reúne progresión
 * personal, desafíos y competencia asincrónica") y
 * docs/adr/BLOCK-III-DEFINITION.md §4.18 (Incremento 4, sub-incremento
 * 4.d). Reemplaza el placeholder "Próximamente": Desafíos ya es una
 * capacidad real (4.a-4.c); liga/pregunta rápida/logros siguen sin
 * construirse y NO se muestran como si ya pudieran usarse (misma regla
 * que Master Context exige para esta pantalla).
 *
 * Sin lógica de evaluación de desafíos aquí -- `challengeStatus`/
 * `progressValue`/`targetValue` vienen tal cual del backend
 * (`lib/api/challenges.ts` + `lib/challenges/group-challenges.ts`, ambos
 * de solo presentación). Nunca marca `CLAIMED` de forma optimista: el
 * estado local solo se actualiza con la respuesta confirmada del servidor.
 */
export default function CompetirScreen() {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listChallenges();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setItemErrors({});
    setState({ status: 'ready', challenges: result.data.challenges });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaim(id: string) {
    // Protección contra doble toque -- una solicitud de claim ya en curso bloquea cualquier otra.
    if (claimingId !== null) return;

    setClaimingId(id);
    setItemErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const outcome = await claimChallenge(id);
    setClaimingId(null);

    if (outcome.kind === 'ok') {
      // Actualización local con la respuesta REAL del servidor -- nunca antes de recibirla.
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', challenges: prev.challenges.map((c) => (c.id === id ? outcome.data : c)) } : prev));
      return;
    }

    if (outcome.kind === 'not_completed' || outcome.kind === 'not_found') {
      // El backend discrepa del estado local (409/404) -- reconciliar recargando la lista completa, no adivinar.
      await load();
      return;
    }

    const message = outcome.kind === 'retryable' || outcome.kind === 'network' ? outcome.message : outcome.message;
    setItemErrors((prev) => ({ ...prev, [id]: message }));
  }

  if (state.status === 'loading') return <LoadingState message="Cargando desafíos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.challenges.length === 0) {
    return <EmptyState message="Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí." />;
  }

  const grouped = groupChallenges(state.challenges);
  const sections = [
    { key: 'active', title: 'Activos', data: grouped.active },
    { key: 'completed', title: 'Completados', data: grouped.completed },
    { key: 'claimed', title: 'Reclamados', data: grouped.claimed },
  ].filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Competir
      </Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio(item) * 100}%`, backgroundColor: tokens.color.accent.default }]} />
            </View>
            <Text style={styles.progressLabel}>
              {item.progressValue}/{item.targetValue}
            </Text>

            <Text style={styles.statusLabel}>{STATUS_LABEL[item.challengeStatus]}</Text>

            {itemErrors[item.id] ? <Text style={styles.itemError}>{itemErrors[item.id]}</Text> : null}

            {canClaim(item) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reclamar recompensa de ${item.name}`}
                onPress={() => handleClaim(item.id)}
                disabled={claimingId !== null}
                style={[styles.claimButton, claimingId !== null && styles.claimButtonDisabled]}
              >
                {claimingId === item.id ? <ActivityIndicator color={tokens.color.text.onAccent} /> : <Text style={styles.claimButtonText}>Reclamar</Text>}
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: t.color.background.default },
    title: { fontSize: 22, fontWeight: '700' as const, color: t.color.text.primary },
    list: { gap: 12, paddingBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700' as const, color: t.color.text.secondary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' as const },
    card: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 16,
      gap: 6,
    },
    cardName: { fontSize: 16, fontWeight: '600' as const, color: t.color.text.primary },
    cardDescription: { fontSize: 13, color: t.color.text.secondary },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: t.color.border.default, overflow: 'hidden' as const, marginTop: 4 },
    progressFill: { height: '100%' as const, borderRadius: 4 },
    progressLabel: { fontSize: 12, color: t.color.text.muted },
    statusLabel: { fontSize: 13, fontWeight: '600' as const, color: t.color.text.secondary },
    itemError: { fontSize: 13, color: t.color.state.error.text },
    claimButton: { marginTop: 8, backgroundColor: t.color.accent.default, paddingVertical: 10, borderRadius: 8, alignItems: 'center' as const },
    claimButtonDisabled: { opacity: 0.5 },
    claimButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
  };
}
