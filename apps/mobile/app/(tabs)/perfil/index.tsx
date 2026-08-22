import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { MyAdvancedProfileResponse, PublicProfileResponse } from '@axioma/contracts';
import { useAuth } from '../../../lib/auth/auth-provider';
import { getMyAdvancedProfile } from '../../../lib/api/advanced-profile';
import { initializeProfile, updateProfile } from '../../../lib/api/user';
import { claimPublicProfile, getMyPublicProfile, setPublicProfileVisibility } from '../../../lib/api/public-profile';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { CompetitiveProfileSection } from '../../../components/competitive-profile-section';
import { AcademicStatsSection } from '../../../components/profile/academic-stats-section';
import { SubjectProgressSection } from '../../../components/profile/subject-progress-section';
import { CompetitiveHistorySection } from '../../../components/profile/competitive-history-section';
import { Text, Button, Dialog, IconButton } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; view: MyAdvancedProfileResponse };
type ProfileTab = 'resumen' | 'estadisticas';
type PublicProfileState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: PublicProfileResponse | null };

/**
 * Perfil Avanzado -- LEF Bloque V, Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md
 * §16), reemplaza el `perfil.tsx` plano anterior (ADR-0013/ADR-0008).
 * UNA sola carga canónica vía `GET /user/me/advanced-profile` (Incremento 5)
 * para encabezado + perfil competitivo propio + resumen académico +
 * historial competitivo -- evita el fetch duplicado que antes hacía
 * `CompetitiveProfileSection` por su cuenta (decisión del Product Owner,
 * Incremento 8).
 *
 * PROFILE-4 (decisión del Product Owner, 2026-08-22) -- selector local
 * Resumen/Estadísticas (estado local, sin rutas hijas ni tabs globales,
 * ambos leen el MISMO `view` ya cargado, sin fetch adicional al cambiar).
 *
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- reorganización:
 * "Personalización" (`personalizacion.tsx`) queda EXCLUSIVAMENTE dedicada a
 * apariencia (cosméticos + títulos). Toda la configuración de CUENTA
 * (editar displayName, username/privacidad, cerrar sesión) se traslada a un
 * panel de Ajustes -- un `Dialog` generalizado montado AQUÍ, abierto desde
 * el engranaje del hero (antes tres puntos -> Personalización, redundante
 * con el lápiz; ahora -> Ajustes, sin navegar a ninguna pantalla).
 *
 * `displayName` para el editor de Ajustes se siembra directamente desde
 * `view.profile.displayName` -- el MISMO dato de la única carga canónica
 * de esta pantalla. Ya NO existe un `getProfile()` independiente para
 * esto (PROFILE-4 lo necesitaba porque la edición vivía en otra pantalla
 * desacoplada del agregador; ahora que vive aquí mismo, esa independencia
 * ya no aporta nada -- es una simplificación real, cero fetches nuevos).
 * Tras guardar, se llama a `load()` (la MISMA función de carga canónica)
 * para reconciliar el hero -- no hay navegación de por medio que dispare
 * `useFocusEffect`, así que la reconciliación es explícita aquí.
 *
 * `visibilityStatus` SIGUE sin estar en el agregador (`meCompetitiveProfileResponseSchema`
 * no lo expone) -- `getMyPublicProfile()` se mantiene como llamada
 * independiENTE, pero ahora es LAZY: solo se pide la primera vez que el
 * usuario abre Ajustes en esta sesión de pantalla, nunca en cada foco de
 * Perfil. Si Ajustes se cierra y se reabre sin haber mutado nada, NO se
 * vuelve a pedir (se reutiliza el estado ya cargado); tras un reclamo de
 * username exitoso si se recarga explícitamente (reconciliación real).
 */
export default function PerfilScreen() {
  const auth = useAuth();
  const router = useRouter();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [tab, setTab] = useState<ProfileTab>('resumen');

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publicProfileState, setPublicProfileState] = useState<PublicProfileState | null>(null);
  const [claimUsername, setClaimUsername] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [toggleVisibilityError, setToggleVisibilityError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getMyAdvancedProfile();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', view: result.data });
  }, []);

  // PROFILE-2 -- `useFocusEffect` (mismo patrón ya usado en `ia/index.tsx`)
  // en vez de `useEffect` simple: recarga el agregador cada vez que esta
  // pantalla vuelve a tener foco, incluida la vuelta desde Personalización
  // (tras equipar un cosmético ahí).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadPublicProfile = useCallback(async () => {
    setPublicProfileState({ status: 'loading' });
    const result = await getMyPublicProfile();
    if (result.ok) {
      setPublicProfileState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      // Estado REAL esperado ("username todavía no reclamado"), no un error -- mismo criterio que preview.tsx/[username].tsx.
      setPublicProfileState({ status: 'ready', profile: null });
      return;
    }
    setPublicProfileState({ status: 'error', message: result.message });
  }, []);

  function openSettings() {
    setSettingsVisible(true);
    // Carga LAZY -- solo la primera vez que se abre Ajustes en esta sesión
    // de pantalla (`publicProfileState === null`). Reabrir sin haber
    // mutado nada reutiliza el estado ya cargado, sin pedirlo de nuevo.
    if (publicProfileState === null) {
      loadPublicProfile();
    }
  }

  function closeSettings() {
    setSettingsVisible(false);
    setEditingName(false);
    setSaveError(null);
    setClaimError(null);
    setToggleVisibilityError(null);
  }

  async function handleSaveName() {
    if (state.status !== 'ready') return;
    setSaveError(null);
    setSaving(true);
    const result = state.view.profile === null ? await initializeProfile({ displayName: displayNameDraft.trim() }) : await updateProfile({ displayName: displayNameDraft.trim() });
    setSaving(false);
    if (result.ok) {
      setEditingName(false);
      await load();
      return;
    }
    setSaveError(result.message);
  }

  async function handleClaimUsername() {
    setClaimError(null);
    setClaiming(true);
    const result = await claimPublicProfile(claimUsername.trim());
    setClaiming(false);
    if (result.ok) {
      setClaimUsername('');
      // Reclamar username SÍ cambia lo que el hero muestra (`view.publicProfile`
      // pasa de null a resuelto) -- reconciliación explícita del agregador,
      // igual que cualquier otra escritura real en esta pantalla.
      await load();
      await loadPublicProfile();
      return;
    }
    setClaimError(result.message);
  }

  async function handleToggleVisibility() {
    if (publicProfileState?.status !== 'ready' || publicProfileState.profile === null) return;
    const nextVisible = publicProfileState.profile.visibilityStatus !== 'VISIBLE';
    setToggleVisibilityError(null);
    setTogglingVisibility(true);
    const result = await setPublicProfileVisibility(nextVisible);
    setTogglingVisibility(false);
    if (result.ok) {
      setPublicProfileState({ status: 'ready', profile: result.data });
      return;
    }
    setToggleVisibilityError(result.message);
  }

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { view } = state;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.space6 }]}>
        {/*
          PROFILE-3/4/5B -- el hero (`CompetitiveProfileSection`) es el
          inicio visual real de la pantalla. `onPersonalizePress` (lápiz)
          -> Personalización (apariencia). `onOpenSettings` (engranaje,
          antes tres puntos) -> abre el panel de Ajustes local, SIN
          navegar. `CompetitiveProfileSection` conserva su invariante de
          presentación pura (gate histórico, verify-competitive-profile-gate.ts).
        */}
        <CompetitiveProfileSection
          profile={view.publicProfile}
          displayName={view.profile?.displayName}
          onPersonalizePress={() => router.push('/(tabs)/perfil/personalizacion')}
          onOpenSettings={openSettings}
        />

        <Button
          label="Ver cómo me ven otros"
          accessibilityLabel="Ver cómo me ven otros"
          onPress={() => router.push('/(tabs)/perfil/preview')}
          variant="tertiary"
          size="small"
          style={styles.previewButton}
        />

        {/*
          PROFILE-4 -- selector interno compacto, estado local únicamente
          (sin rutas hijas, sin tabs globales de Expo Router, sin fetch
          adicional al cambiar). Ambas pestañas leen el MISMO `view` ya
          cargado arriba.
        */}
        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'resumen' }}
            accessibilityLabel="Pestaña Resumen"
            onPress={() => setTab('resumen')}
            style={[styles.tabItem, tab === 'resumen' && styles.tabItemActive]}
          >
            <Text variant="bodySmall" weight="semibold" style={tab === 'resumen' ? { color: tokens.color.accent.default } : undefined} color={tab === 'resumen' ? 'primary' : 'secondary'}>
              Resumen
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'estadisticas' }}
            accessibilityLabel="Pestaña Estadísticas"
            onPress={() => setTab('estadisticas')}
            style={[styles.tabItem, tab === 'estadisticas' && styles.tabItemActive]}
          >
            <Text variant="bodySmall" weight="semibold" style={tab === 'estadisticas' ? { color: tokens.color.accent.default } : undefined} color={tab === 'estadisticas' ? 'primary' : 'secondary'}>
              Estadísticas
            </Text>
          </Pressable>
        </View>

        {tab === 'resumen' ? (
          <SubjectProgressSection summary={view.academicSummary} />
        ) : (
          <>
            <AcademicStatsSection summary={view.academicSummary} />
            {/*
              PROFILE-4 -- `CompetitiveHistorySection` reconectado aquí
              (Estadísticas), mismo `view.competitiveHistory` del agregador
              ya cargado -- sin un fetch nuevo. Fue desconectado visualmente
              de Perfil en PROFILE-3; su componente/contrato nunca se tocó.
            */}
            <CompetitiveHistorySection history={view.competitiveHistory} />
          </>
        )}
      </ScrollView>

      {/*
        PROFILE-5B -- panel de Ajustes: `Dialog` generalizado (shell Modal +
        overlay + card reutilizado, sin primitivo nuevo). Contenido:
        editar nombre (expandible inline) -> username/privacidad (mutuamente
        excluyentes, misma condición que antes: `publicProfile === null`) ->
        cerrar sesión. Misma lógica exacta que tenía `personalizacion.tsx`
        antes de PROFILE-5B, solo reubicada.
      */}
      <Dialog visible={settingsVisible} onRequestClose={closeSettings}>
        {/*
          UI-POLISH-1C -- affordance explícita de cierre (X), mismo patrón ya
          validado en los Dialogs de Tutor IA (AI-1A): se deja de usar el
          `title` plano de `Dialog` y se construye un header propio con el
          mismo texto ("Ajustes") + `IconButton` (icono `close` ya
          existente) que llama EXACTAMENTE a `closeSettings`, la misma
          función que ya cierra el modal vía Android Back -- ningún
          controlador nuevo, ningún cambio en `Dialog` compartido.
        */}
        <View style={styles.settingsHeader}>
          <Text variant="heading3" accessibilityRole="header">
            Ajustes
          </Text>
          <IconButton name="close" accessibilityLabel="Cerrar ajustes" onPress={closeSettings} color="secondary" />
        </View>
        <View style={styles.settingsSection}>
          {editingName ? (
            <View style={styles.editor}>
              <TextInput
                accessibilityLabel="Nombre a mostrar"
                placeholder="Nombre a mostrar"
                placeholderTextColor={tokens.color.text.muted}
                selectionColor={tokens.color.accent.default}
                cursorColor={tokens.color.accent.default}
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                style={styles.input}
                autoFocus
              />
              {saveError ? (
                <Text variant="bodySmall" color="error">
                  {saveError}
                </Text>
              ) : null}
              <Button
                label={view.profile === null ? 'Guardar perfil' : 'Guardar cambios'}
                accessibilityLabel={view.profile === null ? 'Guardar perfil' : 'Guardar cambios'}
                onPress={handleSaveName}
                loading={saving}
                disabled={!displayNameDraft.trim() || displayNameDraft === (view.profile?.displayName ?? '')}
                variant="primary"
                size="small"
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar nombre"
              onPress={() => {
                setDisplayNameDraft(view.profile?.displayName ?? '');
                setEditingName(true);
              }}
              style={styles.settingsRow}
            >
              <Text variant="body" weight="semibold">
                Editar nombre
              </Text>
              <Text variant="bodySmall" color="secondary">
                {view.profile?.displayName ?? 'Sin nombre'}
              </Text>
            </Pressable>
          )}
          {/*
            PROFILE-5B -- `timezone` es puramente INFORMATIVO: auditado
            `personalizacion.tsx` (pre-5B) y confirmado que nunca tuvo un
            `TextInput`/selector propio -- solo se mostraba como texto de
            solo lectura junto al editor de nombre. Se conserva aquí, mismo
            tratamiento exacto (sin inventar edición que nunca existió).
          */}
          {view.profile !== null ? (
            <Text variant="caption" color="secondary">
              Zona horaria: {view.profile.timezone}
            </Text>
          ) : null}
        </View>

        {publicProfileState === null || publicProfileState.status === 'loading' ? (
          <Text variant="bodySmall" color="secondary">
            Cargando identidad pública…
          </Text>
        ) : publicProfileState.status === 'error' ? (
          <Text variant="bodySmall" color="error">
            {publicProfileState.message}
          </Text>
        ) : publicProfileState.profile === null ? (
          <View style={styles.settingsSection}>
            <Text variant="body" weight="semibold">
              Nombre de usuario
            </Text>
            <Text variant="bodySmall" color="secondary">
              Necesitas un nombre de usuario público para tener perfil competitivo, aparecer en Clasificación y que otros puedan verte.
            </Text>
            <View style={styles.editor}>
              <TextInput
                accessibilityLabel="Nombre de usuario"
                placeholder="Nombre de usuario"
                placeholderTextColor={tokens.color.text.muted}
                selectionColor={tokens.color.accent.default}
                cursorColor={tokens.color.accent.default}
                autoCapitalize="none"
                autoCorrect={false}
                value={claimUsername}
                onChangeText={setClaimUsername}
                style={styles.input}
              />
              {claimError ? (
                <Text variant="bodySmall" color="error">
                  {claimError}
                </Text>
              ) : null}
              <Button
                label="Reclamar nombre de usuario"
                accessibilityLabel="Reclamar nombre de usuario"
                onPress={handleClaimUsername}
                loading={claiming}
                disabled={!claimUsername.trim()}
                variant="primary"
                size="small"
              />
            </View>
          </View>
        ) : (
          <View style={styles.settingsSection}>
            <Text variant="body" weight="semibold">
              Perfil público
            </Text>
            <View style={styles.settingsRow}>
              <Text variant="bodySmall" color="secondary">
                {publicProfileState.profile.visibilityStatus === 'VISIBLE' ? 'Visible' : 'Privado'}
              </Text>
              <Button
                label={publicProfileState.profile.visibilityStatus === 'VISIBLE' ? 'Hacer privado' : 'Hacer público'}
                accessibilityLabel={publicProfileState.profile.visibilityStatus === 'VISIBLE' ? 'Hacer perfil privado' : 'Hacer perfil público'}
                onPress={handleToggleVisibility}
                loading={togglingVisibility}
                variant="secondary"
                size="small"
              />
            </View>
            {toggleVisibilityError ? (
              <Text variant="bodySmall" color="error">
                {toggleVisibilityError}
              </Text>
            ) : null}
          </View>
        )}

        <Button
          label="Cerrar sesión"
          accessibilityLabel="Cerrar sesión"
          onPress={auth.logout}
          variant="tertiary"
          size="small"
          style={styles.logoutButton}
        />
      </Dialog>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    // `paddingTop` del área segura vive en `scrollContent` (ver JSX, mismo
    // patrón que Inicio/Competir) -- `container` ya NO lleva su propio
    // `paddingTop` fijo para no duplicarlo con el de abajo.
    container: { flex: 1, paddingHorizontal: spacing.space6, backgroundColor: t.color.background.default },
    scroll: { flex: 1 },
    scrollContent: { gap: spacing.space3, paddingBottom: spacing.space4 },
    // PROFILE-5A.1 -- `scrollContent.gap` (space3/12) aplica el mismo aire
    // ANTES y DESPUÉS de este botón que entre cualquier otro par de
    // bloques del Resumen. `Button` conserva su caja táctil de 44px
    // (invariante del design system, sin tocar el primitive) -- el exceso
    // percibido era puramente el gap del contenedor sumado a esa altura
    // mínima. Márgenes negativos recortan SOLO el aire alrededor de este
    // botón (12 -> ~6 arriba y abajo), sin tocar el gap de ningún otro par
    // de hermanos ni la geometría del hero/selector.
    previewButton: { alignSelf: 'flex-start' as const, marginTop: -6, marginBottom: -6 },
    tabBar: { flexDirection: 'row' as const, gap: spacing.space5, borderBottomWidth: 1, borderBottomColor: t.color.border.default },
    tabItem: { paddingVertical: spacing.space2, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: t.color.accent.default },
    settingsHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    settingsSection: { gap: spacing.space2 },
    settingsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: spacing.space2 },
    editor: { gap: spacing.space2 },
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
    logoutButton: { alignSelf: 'center' as const, marginTop: spacing.space2 },
  };
}
