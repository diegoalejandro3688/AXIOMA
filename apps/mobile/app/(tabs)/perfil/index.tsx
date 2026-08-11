import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { MyAdvancedProfileResponse } from '@axioma/contracts';
import { useAuth } from '../../../lib/auth/auth-provider';
import { initializeProfile, updateProfile } from '../../../lib/api/user';
import { getMyAdvancedProfile } from '../../../lib/api/advanced-profile';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { CosmeticsSection } from '../../../components/cosmetics-section';
import { TitlesSection } from '../../../components/profile/titles-section';
import { CompetitiveProfileSection } from '../../../components/competitive-profile-section';
import { AcademicSummarySection } from '../../../components/profile/academic-summary-section';
import { CompetitiveHistorySection } from '../../../components/profile/competitive-history-section';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; view: MyAdvancedProfileResponse };

/**
 * Perfil Avanzado -- LEF Bloque V, Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md
 * §16), reemplaza el `perfil.tsx` plano anterior (ADR-0013/ADR-0008).
 * UNA sola carga canónica vía `GET /user/me/advanced-profile` (Incremento 5)
 * para encabezado + perfil competitivo propio + resumen académico +
 * historial competitivo -- evita el fetch duplicado que antes hacía
 * `CompetitiveProfileSection` por su cuenta (decisión del Product Owner,
 * Incremento 8). Personalización (cosméticos/títulos) mantiene su propio
 * fetch -- son catálogos grandes, independientes del agregador, con su
 * propia escritura (equipar) y su propia reconciliación tras cada `PUT`/
 * `PATCH`, mismo patrón ya usado por `CosmeticsSection` desde Bloque III.
 *
 * "Ver cómo me ven otros" navega a `/perfil/preview` (Incremento 7) --
 * pantalla separada, sin mezclar su estado con el de esta (el contrato de
 * la preview exige ser una representación fiel de la superficie pública
 * real, nunca una vista derivada de este agregador).
 */
export default function PerfilScreen() {
  const auth = useAuth();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getMyAdvancedProfile();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setDisplayName(result.data.profile?.displayName ?? '');
    setState({ status: 'ready', view: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInitialize() {
    setSaveError(null);
    setSaving(true);
    const result = await initializeProfile({ displayName: displayName.trim() });
    setSaving(false);
    if (result.ok) {
      // Reconciliación tras la escritura -- recarga el agregador completo (nunca actualización optimista) para que el resto de la pantalla quede consistente con el nuevo `UserProfile`.
      await load();
      return;
    }
    setSaveError(result.message);
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    const result = await updateProfile({ displayName: displayName.trim() });
    setSaving(false);
    if (result.ok) {
      await load();
      return;
    }
    setSaveError(result.message);
  }

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { view } = state;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle} accessibilityRole="header">
          Perfil
        </Text>

        <TextInput
          accessibilityLabel="Nombre a mostrar"
          placeholder="Nombre a mostrar"
          placeholderTextColor={tokens.color.text.muted}
          selectionColor={tokens.color.accent.default}
          cursorColor={tokens.color.accent.default}
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
        />
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

        {view.profile === null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Guardar perfil"
            onPress={handleInitialize}
            disabled={saving || !displayName.trim()}
            style={[styles.saveButton, (saving || !displayName.trim()) && styles.buttonDisabled]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar perfil</Text>}
          </Pressable>
        ) : (
          <>
            <Text style={styles.meta}>Zona horaria: {view.profile.timezone}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
              onPress={handleSave}
              disabled={saving || !displayName.trim() || displayName === view.profile.displayName}
              style={[
                styles.saveButton,
                (saving || !displayName.trim() || displayName === view.profile.displayName) && styles.buttonDisabled,
              ]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
            </Pressable>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver cómo me ven otros"
          onPress={() => router.push('/(tabs)/perfil/preview')}
          style={styles.previewButton}
        >
          <Text style={styles.previewButtonText}>Ver cómo me ven otros</Text>
        </Pressable>

        <CompetitiveProfileSection profile={view.publicProfile} />
        <AcademicSummarySection summary={view.academicSummary} />
        <CompetitiveHistorySection history={view.competitiveHistory} />
        <CosmeticsSection />
        <TitlesSection />
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={auth.logout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

/**
 * Alcance mínimo (ver ADR-0015, corrección de contraste fuera de M1): solo
 * `container`/`pageTitle`/`meta` pasan por tokens -- el resto de esta
 * pantalla (input, botones, logout) no se rediseña ni se migra, queda igual
 * que antes.
 */
function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, backgroundColor: t.color.background.default },
    scroll: { flex: 1 },
    scrollContent: { gap: 12, paddingBottom: 16 },
    pageTitle: { fontSize: 24, fontWeight: '700' as const, marginBottom: 8, color: t.color.text.primary },
    input: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      color: t.color.text.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 15,
    },
    error: { color: '#c00', fontSize: 13 },
    meta: { fontSize: 13, color: t.color.text.secondary },
    saveButton: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 8, alignItems: 'center' as const },
    buttonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#fff', fontWeight: '600' as const },
    previewButton: {
      alignSelf: 'flex-start' as const,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.color.accent.default,
    },
    previewButtonText: { color: t.color.accent.default, fontWeight: '600' as const, fontSize: 13 },
    logoutButton: {
      marginTop: 12,
      alignSelf: 'center' as const,
      marginBottom: 16,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#c00',
    },
    logoutButtonText: { color: '#c00', fontWeight: '600' as const },
  };
}
