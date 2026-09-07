import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PublicParticipationTermsStatusResponse } from '@axioma/contracts';
import { acceptPublicParticipationTerms, getPublicParticipationTermsStatus } from '../../../lib/api/compliance';
import {
  PUBLIC_PARTICIPATION_TERMS_INTRO,
  PUBLIC_PARTICIPATION_TERMS_SECTIONS,
  PUBLIC_PARTICIPATION_TERMS_VERSION,
} from '../../../lib/compliance/public-participation-terms-content';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Button } from '../../../components/ui';
import { useThemedStyles, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; terms: PublicParticipationTermsStatusResponse };

/**
 * PS-0C.2 -- pantalla interna VERSIONADA de los "Términos de uso y
 * convivencia pública". Sirve como (a) lectura desde Ajustes y (b)
 * superficie de aceptación cuando aún no se aceptó la versión vigente.
 * NUNCA bloquea el uso privado -- sólo la publicación de identidad pública
 * consulta `isCurrent`.
 */
export default function PublicParticipationTermsScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getPublicParticipationTermsStatus();
    if (result.ok) setState({ status: 'ready', terms: result.data });
    else setState({ status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAccept = useCallback(async () => {
    setAcceptError(null);
    setAccepting(true);
    const result = await acceptPublicParticipationTerms();
    setAccepting(false);
    if (result.ok) {
      router.back();
      return;
    }
    setAcceptError(result.message);
  }, [router]);

  if (state.status === 'loading') return <LoadingState message="Cargando términos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color="muted">
          Versión {PUBLIC_PARTICIPATION_TERMS_VERSION}
          {state.terms.isCurrent ? ' · Aceptada' : ''}
        </Text>
        <Text variant="body" color="secondary" style={styles.intro}>
          {PUBLIC_PARTICIPATION_TERMS_INTRO}
        </Text>
        {PUBLIC_PARTICIPATION_TERMS_SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text variant="body" weight="semibold">
              {section.heading}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.sectionBody}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {state.terms.isCurrent ? (
          <Text variant="bodySmall" color="secondary" style={styles.footerNote}>
            Ya aceptaste la versión vigente.
          </Text>
        ) : (
          <>
            {acceptError ? (
              <Text variant="bodySmall" color="error" style={styles.footerNote}>
                {acceptError}
              </Text>
            ) : null}
            {accepting ? <ActivityIndicator /> : null}
            <Button label="Aceptar términos" accessibilityLabel="Aceptar términos" onPress={onAccept} loading={accepting} variant="primary" />
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: spacing.space5, gap: spacing.space3 },
    intro: { marginTop: spacing.space2 },
    section: { gap: spacing.space1, marginTop: spacing.space3 },
    sectionBody: {},
    footer: {
      padding: spacing.space5,
      borderTopWidth: 1,
      borderTopColor: t.color.border.default,
      gap: spacing.space2,
      backgroundColor: t.color.background.surface,
    },
    footerNote: { textAlign: 'center' as const },
  };
}
