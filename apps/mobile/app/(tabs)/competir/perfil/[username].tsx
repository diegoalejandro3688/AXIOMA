import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CompetitiveProfileResponse, PublicProfileReportType } from '@axioma/contracts';
import { getUserCompetitiveProfile } from '../../../../lib/api/competitive';
import { blockUser, reportPublicProfile } from '../../../../lib/api/safety';
import { PUBLIC_PROFILE_REPORT_OPTIONS, REPORT_SENT_MESSAGE } from '../../../../lib/safety/report-categories';
import { PublicProfileView } from '../../../../components/competitive/public-profile-view';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { Text, Chip, Dialog } from '../../../../components/ui';
import { useThemedStyles, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_found' }
  | { status: 'ready'; profile: CompetitiveProfileResponse };

/**
 * Perfil competitivo de OTRO usuario -- Bloque IV, Incremento 5. SOLO
 * LECTURA para los datos del perfil.
 *
 * PS-0C.2 -- añade acciones de seguridad DISCRETAS al pie: "Reportar
 * usuario" (3 categorías fijas, sin texto libre) y "Bloquear usuario". No
 * rediseña la pantalla ni el componente `PublicProfileView`. Tras bloquear,
 * el perfil deja de ser accesible -> se vuelve atrás.
 *
 * 404 uniforme (ADR-0021): PRIVATE/RETIRED/ANONIMIZED/inexistente/bloqueado
 * responden todos igual.
 */
export default function OtherCompetitiveProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const [reportVisible, setReportVisible] = useState(false);
  const [reportType, setReportType] = useState<PublicProfileReportType | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [blockVisible, setBlockVisible] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getUserCompetitiveProfile(username);
    if (result.ok) {
      setState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      setState({ status: 'not_found' });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReport = useCallback(async () => {
    if (!reportType) return;
    setActionError(null);
    setReporting(true);
    const result = await reportPublicProfile(username, reportType);
    setReporting(false);
    if (result.ok) {
      setReportResult(REPORT_SENT_MESSAGE);
      setReportType(null);
      return;
    }
    setActionError(result.message);
  }, [reportType, username]);

  const confirmBlock = useCallback(async () => {
    setActionError(null);
    setBlocking(true);
    const result = await blockUser(username);
    setBlocking(false);
    if (result.ok) {
      setBlockVisible(false);
      router.back();
      return;
    }
    setActionError(result.message);
  }, [router, username]);

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.status === 'not_found') {
    return (
      <View style={styles.notFoundContainer}>
        <Text variant="body" color="secondary" style={styles.notFoundMessage}>
          Este perfil no está disponible.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <PublicProfileView profile={state.profile} />

      {/* PS-0C.2 -- acciones de seguridad discretas. */}
      <View style={styles.safetyBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Reportar usuario" onPress={() => setReportVisible(true)}>
          <Text variant="bodySmall" color="secondary">
            Reportar usuario
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bloquear usuario" onPress={() => setBlockVisible(true)}>
          <Text variant="bodySmall" color="error">
            Bloquear usuario
          </Text>
        </Pressable>
      </View>

      <Dialog
        visible={reportVisible}
        title="Reportar usuario"
        onRequestClose={() => {
          setReportVisible(false);
          setReportResult(null);
          setReportType(null);
          setActionError(null);
        }}
        primaryAction={
          reportResult
            ? { label: 'Listo', onPress: () => { setReportVisible(false); setReportResult(null); } }
            : { label: 'Enviar reporte', onPress: submitReport }
        }
        secondaryAction={
          reportResult ? undefined : { label: 'Cancelar', onPress: () => setReportVisible(false), variant: 'tertiary' }
        }
      >
        {reportResult ? (
          <Text variant="bodySmall" color="secondary">
            {reportResult}
          </Text>
        ) : (
          <>
            <Text variant="bodySmall" color="secondary">
              ¿Qué problema tiene este perfil?
            </Text>
            <View style={styles.categoryRow}>
              {PUBLIC_PROFILE_REPORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reportType === option.value }}
                  accessibilityLabel={option.label}
                  onPress={() => setReportType(option.value)}
                >
                  <Chip label={option.label} variant={reportType === option.value ? 'selected' : 'neutral'} />
                </Pressable>
              ))}
            </View>
            {reporting ? <Text variant="bodySmall" color="secondary">Enviando…</Text> : null}
            {actionError ? (
              <Text variant="bodySmall" color="error">
                {actionError}
              </Text>
            ) : null}
          </>
        )}
      </Dialog>

      <Dialog
        visible={blockVisible}
        title="Bloquear usuario"
        message="No verás la identidad de esta persona en la Clasificación ni podrás abrir su perfil. Seguirá apareciendo en su posición real. Bloquear no la sanciona."
        onRequestClose={() => setBlockVisible(false)}
        primaryAction={{ label: 'Bloquear', onPress: confirmBlock, variant: 'danger' }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setBlockVisible(false), variant: 'tertiary' }}
      >
        {blocking ? <Text variant="bodySmall" color="secondary">Bloqueando…</Text> : null}
        {actionError ? (
          <Text variant="bodySmall" color="error">
            {actionError}
          </Text>
        ) : null}
      </Dialog>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    wrapper: { flex: 1, backgroundColor: t.color.background.default },
    safetyBar: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.space5,
      paddingVertical: spacing.space4,
      borderTopWidth: 1,
      borderTopColor: t.color.border.default,
    },
    categoryRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.space2, marginTop: spacing.space2 },
    notFoundContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24, backgroundColor: t.color.background.default },
    notFoundMessage: { textAlign: 'center' as const },
  };
}
