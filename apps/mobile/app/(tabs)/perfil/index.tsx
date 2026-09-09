import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { COMPLIANCE_ERROR_CODES, type MyAdvancedProfileResponse, type PublicProfileResponse } from '@axioma/contracts';
import { useAuth } from '../../../lib/auth/auth-provider';
import { getMyAdvancedProfile } from '../../../lib/api/advanced-profile';
import { initializeProfile, updateProfile } from '../../../lib/api/user';
import { changePublicUsername, claimPublicProfile, getMyPublicProfile, setPublicProfileVisibility } from '../../../lib/api/public-profile';
import { acceptPublicParticipationTerms, getPublicParticipationTermsStatus } from '../../../lib/api/compliance';
import { PUBLIC_PARTICIPATION_TERMS_INTRO, PUBLIC_PARTICIPATION_TERMS_TITLE } from '../../../lib/compliance/public-participation-terms-content';
import { PRIVACY_POLICY_URL, SUPPORT_CONTACT, isConfigured } from '../../../lib/compliance/legal-links';
import { requestAccountDeletion } from '../../../lib/api/privacy';
import { useEntitlement } from '../../../lib/entitlement/entitlement-provider';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { CompetitiveProfileSection } from '../../../components/competitive-profile-section';
import { AcademicStatsSection } from '../../../components/profile/academic-stats-section';
import { SubjectProgressSection } from '../../../components/profile/subject-progress-section';
import { CompetitiveHistorySection } from '../../../components/profile/competitive-history-section';
import { Text, Button, Chip, Dialog, IconButton } from '../../../components/ui';
import { useAppearancePreference, useTheme, useThemedStyles, spacing } from '../../../theme';
import type { AppearancePreference, ThemeTokens } from '../../../theme';

const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

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
  const { preference: appearancePreference, setPreference: setAppearancePreference } = useAppearancePreference();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  // SETTINGS-HOTFIX -- el panel de Ajustes vive en el `Dialog` compartido
  // (Modal centrado, `padding: space6` exterior + `space5` de card, sin scroll
  // ni inset inferior). Con edge-to-edge de Android (Expo SDK 54 / RN 0.81),
  // el contenido baja detrás de la barra de navegación del sistema y
  // "Cerrar sesión" quedaba parcialmente oculta / no pulsable de forma fiable.
  // Se acota la altura del contenido scrollable para que la card entera quepa
  // entre los insets; el `paddingBottom` (abajo, en el JSX) usa `insets.bottom`.
  const settingsScrollMaxHeight = Math.max(
    240,
    windowHeight - insets.top - insets.bottom - spacing.space6 * 2 - spacing.space5 * 2 - spacing.space8,
  );
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
  // PS-0C.2 -- gate de Términos de participación pública antes de HACER VISIBLE.
  const [termsPromptVisible, setTermsPromptVisible] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  // PS-0C.2 -- recuperación tras un reset de username por moderación.
  const [renameUsername, setRenameUsername] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  // STABILIZATION-B -- Cuenta: solicitud de eliminación (confirmación destructiva explícita).
  const [deletionConfirmVisible, setDeletionConfirmVisible] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionRequesting, setDeletionRequesting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const entitlement = useEntitlement();

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
    // RQ-06: `getMyPublicProfile` ya nunca lanza por desviación de esquema
    // (`apiRequest` devuelve `kind:'schema'`), pero este `try/catch` garantiza
    // un estado TERMINAL pase lo que pase -- "Cargando identidad pública…"
    // nunca puede quedar colgado indefinidamente.
    let result;
    try {
      result = await getMyPublicProfile();
    } catch {
      setPublicProfileState({ status: 'error', message: 'No se pudo cargar tu identidad pública. Vuelve a intentarlo.' });
      return;
    }
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

  async function handleConfirmAccountDeletion() {
    setDeletionRequesting(true);
    setDeletionError(null);
    const result = await requestAccountDeletion();
    setDeletionRequesting(false);
    if (!result.ok) {
      setDeletionError(result.message);
      return;
    }
    setDeletionConfirmVisible(false);
    setDeletionRequested(true);
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

  async function applyVisibility(nextVisible: boolean) {
    setToggleVisibilityError(null);
    setTogglingVisibility(true);
    const result = await setPublicProfileVisibility(nextVisible);
    setTogglingVisibility(false);
    if (result.ok) {
      setPublicProfileState({ status: 'ready', profile: result.data });
      return true;
    }
    // PS-0C.2 -- backend authority: si falta aceptar Términos, abre el prompt
    // (por si el pre-chequeo de estado se saltó por una carrera).
    if (result.kind === 'http' && result.code === COMPLIANCE_ERROR_CODES.PUBLIC_TERMS_ACCEPTANCE_REQUIRED) {
      setTermsError(null);
      setTermsPromptVisible(true);
      return false;
    }
    setToggleVisibilityError(result.message);
    return false;
  }

  async function handleToggleVisibility() {
    if (publicProfileState?.status !== 'ready' || publicProfileState.profile === null) return;
    const nextVisible = publicProfileState.profile.visibilityStatus !== 'VISIBLE';
    // PS-0C.2 -- HACER VISIBLE exige la versión vigente de los Términos.
    // Hacer PRIVADO nunca lo exige.
    if (nextVisible) {
      setToggleVisibilityError(null);
      setTogglingVisibility(true);
      const status = await getPublicParticipationTermsStatus();
      setTogglingVisibility(false);
      if (status.ok && !status.data.isCurrent) {
        setTermsError(null);
        setTermsPromptVisible(true);
        return;
      }
    }
    await applyVisibility(nextVisible);
  }

  async function handleAcceptTermsAndContinue() {
    setTermsError(null);
    setAcceptingTerms(true);
    const result = await acceptPublicParticipationTerms();
    setAcceptingTerms(false);
    if (!result.ok) {
      setTermsError(result.message);
      return;
    }
    setTermsPromptVisible(false);
    // Continúa la acción original: hacer visible el perfil.
    await applyVisibility(true);
  }

  async function handleRecoverUsername() {
    setRenameError(null);
    setRenaming(true);
    const result = await changePublicUsername(renameUsername.trim());
    setRenaming(false);
    if (result.ok) {
      setRenameUsername('');
      setPublicProfileState({ status: 'ready', profile: result.data });
      await load();
      return;
    }
    setRenameError(result.message);
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
        {/*
          SETTINGS-HOTFIX -- el contenido del panel se hace scrollable y con
          `paddingBottom: insets.bottom` para que, con edge-to-edge de Android,
          "Cerrar sesión" (último elemento) quede siempre visible, separada de
          la barra de navegación del sistema y pulsable. El header queda fijo
          fuera del scroll (X siempre accesible).
        */}
        <ScrollView
          style={{ maxHeight: settingsScrollMaxHeight }}
          contentContainerStyle={[styles.settingsScrollContent, { paddingBottom: insets.bottom + spacing.space4 }]}
          showsVerticalScrollIndicator={false}
        >
        {/* STABILIZATION-B8 (Polish D) -- agrupación visual (Cuenta / Preferencias / Privacidad / Plan). Sólo jerarquía y etiquetas: ningún control nuevo, ninguna funcionalidad nueva. */}
        <Text variant="caption" color="muted" weight="semibold" style={styles.settingsGroupLabel}>
          CUENTA
        </Text>
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

        {/*
          THEME-1 -- selector de apariencia (Sistema/Claro/Oscuro), entre
          "Editar nombre"/"Zona horaria" y "Perfil público" (ubicación
          aprobada). Reutiliza `Chip` (variante `selected` ya existente)
          envuelto en `Pressable`, mismo patrón de opción-con-check ya usado
          en `AiModeSelector` -- sin Dialog anidado ni componente nuevo:
          cambia inmediatamente la preferencia en memoria (propagada por
          `ThemeProvider` a toda la app) y la persiste vía `localFlags`.
        */}
        <Text variant="caption" color="muted" weight="semibold" style={styles.settingsGroupLabel}>
          PREFERENCIAS
        </Text>
        <View style={styles.settingsSection}>
          <Text variant="body" weight="semibold">
            Apariencia
          </Text>
          <View style={styles.appearanceRow}>
            {APPEARANCE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: appearancePreference === option.value }}
                accessibilityLabel={`Apariencia: ${option.label}`}
                onPress={() => setAppearancePreference(option.value)}
              >
                <Chip label={option.label} variant={appearancePreference === option.value ? 'selected' : 'neutral'} />
              </Pressable>
            ))}
          </View>
        </View>

        <Text variant="caption" color="muted" weight="semibold" style={styles.settingsGroupLabel}>
          PRIVACIDAD
        </Text>
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
        ) : publicProfileState.profile.moderationStatus === 'USERNAME_RESET' ? (
          /* PS-0C.2 -- un operador restableció el nombre de usuario por moderación. */
          <View style={styles.settingsSection}>
            <Text variant="body" weight="semibold">
              Nombre de usuario restablecido
            </Text>
            <Text variant="bodySmall" color="secondary">
              Tu nombre de usuario fue restablecido por moderación. Elige uno nuevo para volver a tener perfil público. Tu progreso, nivel y puntos no se ven afectados.
            </Text>
            <View style={styles.editor}>
              <TextInput
                accessibilityLabel="Nuevo nombre de usuario"
                placeholder="Nuevo nombre de usuario"
                placeholderTextColor={tokens.color.text.muted}
                selectionColor={tokens.color.accent.default}
                cursorColor={tokens.color.accent.default}
                autoCapitalize="none"
                autoCorrect={false}
                value={renameUsername}
                onChangeText={setRenameUsername}
                style={styles.input}
              />
              {renameError ? (
                <Text variant="bodySmall" color="error">
                  {renameError}
                </Text>
              ) : null}
              <Button
                label="Guardar nombre de usuario"
                accessibilityLabel="Guardar nuevo nombre de usuario"
                onPress={handleRecoverUsername}
                loading={renaming}
                disabled={!renameUsername.trim()}
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

        {/* PS-0C.2 -- gestión de usuarios bloqueados. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usuarios bloqueados"
          onPress={() => {
            closeSettings();
            router.push('/(tabs)/perfil/usuarios-bloqueados');
          }}
          style={styles.settingsRow}
        >
          <Text variant="body" weight="semibold">
            Usuarios bloqueados
          </Text>
          <Text variant="bodySmall" color="secondary">
            Ver
          </Text>
        </Pressable>

        {/*
          STABILIZATION-B -- Privacidad: solicitud de eliminación reutilizando el
          endpoint YA existente `POST /privacy/account-deletion` (202, crea
          una SOLICITUD de barrido asíncrono -- NUNCA borra al instante). La
          copia refleja exactamente ese comportamiento real, con confirmación
          destructiva explícita antes de llamar al backend.
        */}
        <View style={styles.settingsSection}>
          <Text variant="body" weight="semibold">
            Eliminar cuenta
          </Text>
          {deletionRequested ? (
            <Text variant="bodySmall" color="secondary">
              Solicitud enviada. Tu cuenta se eliminará en los próximos días.
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar eliminación de cuenta"
              onPress={() => setDeletionConfirmVisible(true)}
              style={styles.settingsRow}
            >
              <Text variant="bodySmall" color="error">
                Solicitar eliminación de cuenta
              </Text>
            </Pressable>
          )}
        </View>

        {/*
          STABILIZATION-B -- Plan: estado autoritativo de entitlement
          (`GET /me/entitlement`, ya consumido app-wide vía `EntitlementProvider`)
          -- solo lectura, sin CTA de compra/restauración mientras Google Play
          real permanezca congelado (ver `GOOGLE_PLAY_PROVIDER_IMPL`).
        */}
        <Text variant="caption" color="muted" weight="semibold" style={styles.settingsGroupLabel}>
          PLAN
        </Text>
        <View style={styles.settingsSection}>
          <Text variant="bodySmall" color="secondary">
            {entitlement.state.status === 'ready' ? (entitlement.isPremium ? 'ZETRYND Premium' : 'ZETRYND Free') : 'Cargando plan…'}
          </Text>
        </View>

        {/*
          PS-0C.2 -- LEGAL Y SOPORTE. Los "Términos de uso y convivencia
          pública" existen ya como pantalla interna versionada. Privacidad y
          Soporte son WIRING preparado para PS-0D: si su URL/contacto no está
          configurado (`legal-links.ts`), la fila se muestra deshabilitada
          como "Disponible próximamente" y NUNCA abre un enlace falso.
        */}
        <Text variant="caption" color="muted" weight="semibold" style={styles.settingsGroupLabel}>
          LEGAL Y SOPORTE
        </Text>
        {/*
          SETTINGS-HOTFIX (cosmético) -- el título largo "Términos de uso y
          convivencia pública" hacía wrap poco natural y "Ver" quedaba
          desalineado (RN no aplica `flexShrink:1` por defecto). El label toma
          el ancho restante (`flex:1`) y la fila alinea al inicio para que
          "Ver" quede junto a la primera línea del título.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PUBLIC_PARTICIPATION_TERMS_TITLE}
          onPress={() => {
            closeSettings();
            router.push('/(tabs)/perfil/terminos');
          }}
          style={[styles.settingsRow, styles.settingsRowTop]}
        >
          <Text variant="body" weight="semibold" style={styles.settingsRowLabelFill}>
            {PUBLIC_PARTICIPATION_TERMS_TITLE}
          </Text>
          <Text variant="bodySmall" color="secondary">
            Ver
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Política de privacidad"
          disabled={!isConfigured(PRIVACY_POLICY_URL)}
          onPress={() => {
            if (isConfigured(PRIVACY_POLICY_URL)) void Linking.openURL(PRIVACY_POLICY_URL);
          }}
          style={styles.settingsRow}
        >
          <Text variant="body" weight="semibold" color={isConfigured(PRIVACY_POLICY_URL) ? 'primary' : 'muted'}>
            Política de privacidad
          </Text>
          <Text variant="bodySmall" color="secondary">
            {isConfigured(PRIVACY_POLICY_URL) ? 'Abrir' : 'Disponible próximamente'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Soporte"
          disabled={!isConfigured(SUPPORT_CONTACT)}
          onPress={() => {
            if (isConfigured(SUPPORT_CONTACT)) void Linking.openURL(SUPPORT_CONTACT);
          }}
          style={styles.settingsRow}
        >
          <Text variant="body" weight="semibold" color={isConfigured(SUPPORT_CONTACT) ? 'primary' : 'muted'}>
            Soporte
          </Text>
          <Text variant="bodySmall" color="secondary">
            {isConfigured(SUPPORT_CONTACT) ? 'Contactar' : 'Disponible próximamente'}
          </Text>
        </Pressable>

        <Button
          label="Cerrar sesión"
          accessibilityLabel="Cerrar sesión"
          onPress={auth.logout}
          variant="tertiary"
          size="small"
          style={styles.logoutButton}
        />
        </ScrollView>
      </Dialog>

      <Dialog
        visible={deletionConfirmVisible}
        title="Eliminar cuenta"
        message="Esto solicita la eliminación de tu cuenta -- no ocurre al instante, se procesará en los próximos días. Esta acción no se puede deshacer."
        onRequestClose={() => setDeletionConfirmVisible(false)}
        primaryAction={{ label: 'Solicitar eliminación', onPress: handleConfirmAccountDeletion, variant: 'danger' }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setDeletionConfirmVisible(false), variant: 'tertiary' }}
      >
        {deletionRequesting ? <ActivityIndicator color={tokens.color.accent.default} /> : null}
        {deletionError ? (
          <Text variant="bodySmall" color="error">
            {deletionError}
          </Text>
        ) : null}
      </Dialog>

      {/*
        PS-0C.2 -- gate de Términos antes de HACER PÚBLICO el perfil. Aceptar
        -> POST accept -> reintenta la acción original (hacer visible).
        Cancelar -> no publica; el uso privado de ZETRYND sigue igual.
      */}
      <Dialog
        visible={termsPromptVisible}
        title={PUBLIC_PARTICIPATION_TERMS_TITLE}
        onRequestClose={() => setTermsPromptVisible(false)}
        primaryAction={{ label: 'Aceptar y continuar', onPress: handleAcceptTermsAndContinue }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setTermsPromptVisible(false), variant: 'tertiary' }}
      >
        <Text variant="bodySmall" color="secondary">
          {PUBLIC_PARTICIPATION_TERMS_INTRO}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver términos completos"
          onPress={() => {
            setTermsPromptVisible(false);
            closeSettings();
            router.push('/(tabs)/perfil/terminos');
          }}
        >
          <Text variant="bodySmall" style={{ color: tokens.color.accent.default, marginTop: spacing.space2 }}>
            Ver términos completos
          </Text>
        </Pressable>
        {acceptingTerms ? <ActivityIndicator color={tokens.color.accent.default} /> : null}
        {termsError ? (
          <Text variant="bodySmall" color="error">
            {termsError}
          </Text>
        ) : null}
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
    // SETTINGS-HOTFIX -- separación entre grupos DENTRO del scroll (antes la
    // daba el `gap: space3` de la card del `Dialog`, que ahora sólo separa el
    // header fijo del scroll).
    settingsScrollContent: { gap: spacing.space3 },
    settingsSection: { gap: spacing.space2 },
    // STABILIZATION-B8 (Polish D) -- etiqueta de grupo: separación clara arriba, mínima abajo (pegada a su sección).
    settingsGroupLabel: { marginTop: spacing.space3, letterSpacing: 0.8 },
    appearanceRow: { flexDirection: 'row' as const, gap: spacing.space2 },
    settingsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: spacing.space2 },
    // SETTINGS-HOTFIX (cosmético, sólo fila de Términos) -- alinear al inicio y
    // dejar que el label ocupe el ancho restante para un wrap natural.
    settingsRowTop: { alignItems: 'flex-start' as const },
    settingsRowLabelFill: { flex: 1 },
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
