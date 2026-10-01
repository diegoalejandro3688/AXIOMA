import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges } from '../../../lib/api/challenges';
import { challengeSections } from '../../../lib/challenges/select-hub-challenges';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, ScreenHeader } from '../../../components/ui';
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
 * recarga manual.
 *
 * VC4 MICROBLOQUE 4.1 -- header PROPIO (`ScreenHeader`, `headerShown:
 * false` en `competir/_layout.tsx`), NO el header nativo de Expo Router
 * (esa parte del fix se mantiene: la flecha nativa dependía de `canGoBack()`
 * y era intermitente). Visible en TODOS los estados (loading/error/ready).
 *
 * VC4 MICROBLOQUE 4.1B -- QA física del fix 4.1 encontró un problema MÁS
 * PROFUNDO: `router.replace('/(tabs)/competir')` desde dentro de esta
 * pantalla (alcanzada por `push` CROSS-TAB desde Inicio) no sólo fallaba
 * a veces (terminaba en Perfil, la PRIMERA pestaña declarada en
 * `(tabs)/_layout.tsx`), sino que dejaba corrupto el stack de Competir
 * (inutilizable después). Causa: `canGoBack()`/`replace()` de un href
 * absoluto que cruza de nivel (de una pantalla anidada al ROOT de su
 * propia tab) dependen del mismo estado de navegación incidental
 * (inicializado o no en memoria) que ya demostró ser no fiable en 4.1 --
 * "arreglado" para la flecha, pero seguía roto para la ACCIÓN de volver.
 *
 * Fix: back DETERMINISTA por origen explícito, nunca por historial
 * incidental. `from` llega como param desde CADA punto de entrada
 * (`app/(tabs)/index.tsx` pasa `from=home`; `competir/index.tsx` pasa
 * `from=competir`) -- el propio código que decide A dónde navegar YA SABE
 * de dónde viene, así que no hace falta inferirlo de la pila:
 *   - from=home     -> `navigation.getParent()?.navigate('index')` (Inicio).
 *   - from=competir (o ausente/desconocido, degradación segura) ->
 *     `StackActions.popToTop()` sobre el stack de Competir + `navigate('competir')`
 *     -- MISMO mecanismo ya probado en `(tabs)/_layout.tsx` (tabPress de
 *     Estudio, Finding 7B) para forzar una pila anidada a su raíz de forma
 *     determinista, en vez de un `replace()` de href absoluto cruzando
 *     niveles (la causa real de la corrupción).
 *
 * Android Back físico usa la MISMA función (`handleBack`) vía `BackHandler`
 * acotado a esta pantalla (armado/desarmado con el foco) -- nunca depende
 * de que la pila nativa resuelva sola un destino coherente.
 */
export default function DesafiosScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { from } = useLocalSearchParams<{ from?: string }>();
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

  const handleBack = useCallback(() => {
    if (from === 'home') {
      navigation.getParent()?.navigate('index');
      return;
    }
    // from === 'competir', o ausente/desconocido (degradación segura hacia
    // el hub, la superficie padre real de esta pantalla).
    navigation.dispatch(StackActions.popToTop());
    navigation.getParent()?.navigate('competir');
  }, [navigation, from]);

  // Android Back físico -- misma decisión determinista que la flecha
  // custom, nunca la resolución nativa incidental (ver docstring arriba).
  // Acotado a esta pantalla: se arma/desarma con el foco, nunca queda
  // escuchando de fondo.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  if (state.status === 'loading') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title="Desafíos" onBack={handleBack} />
        <LoadingState message="Cargando desafíos…" />
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title="Desafíos" onBack={handleBack} />
        <ErrorState message={state.message} onRetry={load} />
      </View>
    );
  }

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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Desafíos" onBack={handleBack} />
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
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default },
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
