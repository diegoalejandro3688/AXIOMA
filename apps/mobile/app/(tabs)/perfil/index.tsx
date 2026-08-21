import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { MyAdvancedProfileResponse } from '@axioma/contracts';
import { useAuth } from '../../../lib/auth/auth-provider';
import { initializeProfile, updateProfile } from '../../../lib/api/user';
import { claimPublicProfile, getMyPublicProfile, setPublicProfileVisibility } from '../../../lib/api/public-profile';
import type { PublicProfileResponse } from '@axioma/contracts';
import { getMyAdvancedProfile } from '../../../lib/api/advanced-profile';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { CosmeticsSection } from '../../../components/cosmetics-section';
import { TitlesSection } from '../../../components/profile/titles-section';
import { CompetitiveProfileSection } from '../../../components/competitive-profile-section';
import { AcademicSummarySection } from '../../../components/profile/academic-summary-section';
import { CompetitiveHistorySection } from '../../../components/profile/competitive-history-section';
import { Text, Button } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../theme';
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
 *
 * UI-3 (DG UI3-3/DG UI3-4): el editor de `displayName` (mismo `TextInput`,
 * mismos `handleInitialize`/`handleSave`, mismo estado) se sigue
 * construyendo y renderizando AQUÍ -- se coloca inmediatamente ANTES de
 * `CompetitiveProfileSection` para quedar adyacente a
 * `CompetitiveIdentityHeader` (primer elemento de esa sección) por ORDEN
 * de renderizado. `CompetitiveProfileSection` conserva su firma exacta
 * `{ profile }` -- el gate histórico `verify-competitive-profile-gate.ts`
 * fija por regex que ese componente es presentación pura con esa única
 * prop, y esa condición se preserva a propósito (no se le pasa el editor
 * como children/prop). Deliberadamente NO se convierte en un patrón
 * "tap-to-edit" -- el `TextInput` sigue siempre visible, igual que antes.
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
  const [claimUsername, setClaimUsername] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  type VisibilityState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: PublicProfileResponse };
  const [visibility, setVisibility] = useState<VisibilityState | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [toggleVisibilityError, setToggleVisibilityError] = useState<string | null>(null);

  const loadVisibility = useCallback(async () => {
    setVisibility({ status: 'loading' });
    const result = await getMyPublicProfile();
    if (!result.ok) {
      setVisibility({ status: 'error', message: result.message });
      return;
    }
    setVisibility({ status: 'ready', profile: result.data });
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getMyAdvancedProfile();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setDisplayName(result.data.profile?.displayName ?? '');
    setState({ status: 'ready', view: result.data });
    // `visibilityStatus` no viene en el agregador (meCompetitiveProfileResponseSchema
    // no lo expone) -- se consulta aparte, únicamente si ya existe PublicProfile.
    if (result.data.publicProfile !== null) {
      await loadVisibility();
    } else {
      setVisibility(null);
    }
  }, [loadVisibility]);

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

  /**
   * `PublicProfile.username` -- concepto DISTINTO de `UserProfile.displayName`
   * (arriba). Sin optimismo: el perfil competitivo se considera creado
   * únicamente tras la respuesta 200/201 real del servidor, nunca antes --
   * `load()` recarga el agregador completo para que `CompetitiveProfileSection`
   * reciba `publicProfile` ya resuelto y deje de mostrar el mensaje de
   * "configura tu nombre de usuario" por sí sola (no se le pasa ningún prop
   * nuevo, sigue con su firma exacta `{ profile }`).
   */
  async function handleClaimUsername() {
    setClaimError(null);
    setClaiming(true);
    const result = await claimPublicProfile(claimUsername.trim());
    setClaiming(false);
    if (result.ok) {
      setClaimUsername('');
      await load();
      return;
    }
    setClaimError(result.message);
  }

  /**
   * Opt-in/opt-out explícito -- el default PRIVATE al crear el perfil no se
   * toca aquí. Sin optimismo: `visibility` solo refleja el resultado
   * REAL devuelto por el PATCH, nunca el valor que el usuario acaba de
   * pedir hasta que el servidor lo confirma.
   */
  async function handleToggleVisibility() {
    if (visibility?.status !== 'ready') return;
    const nextVisible = visibility.profile.visibilityStatus !== 'VISIBLE';
    setToggleVisibilityError(null);
    setTogglingVisibility(true);
    const result = await setPublicProfileVisibility(nextVisible);
    setTogglingVisibility(false);
    if (result.ok) {
      setVisibility({ status: 'ready', profile: result.data });
      return;
    }
    setToggleVisibilityError(result.message);
  }

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { view } = state;

  const identityEditor = (
    <View style={styles.editor}>
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
      {saveError ? (
        <Text variant="bodySmall" color="error">
          {saveError}
        </Text>
      ) : null}

      {view.profile === null ? (
        <Button
          label="Guardar perfil"
          accessibilityLabel="Guardar perfil"
          onPress={handleInitialize}
          loading={saving}
          disabled={!displayName.trim()}
          variant="primary"
          size="small"
        />
      ) : (
        <>
          <Text variant="caption" color="secondary">
            Zona horaria: {view.profile.timezone}
          </Text>
          <Button
            label="Guardar cambios"
            accessibilityLabel="Guardar cambios"
            onPress={handleSave}
            loading={saving}
            disabled={!displayName.trim() || displayName === view.profile.displayName}
            variant="primary"
            size="small"
          />
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text variant="heading1" accessibilityRole="header">
          Perfil
        </Text>

        <Button
          label="Ver cómo me ven otros"
          accessibilityLabel="Ver cómo me ven otros"
          onPress={() => router.push('/(tabs)/perfil/preview')}
          variant="secondary"
          size="small"
          style={styles.previewButton}
        />

        {/*
          DG UI3-4: `CompetitiveProfileSection` conserva su firma exacta
          `{ profile }` (gate histórico) -- el editor se renderiza AQUÍ,
          inmediatamente antes, para quedar adyacente a
          `CompetitiveIdentityHeader` (primer elemento dentro de la
          sección) por ORDEN de renderizado, sin ampliar el contrato del
          componente.
        */}
        {identityEditor}
        {view.publicProfile === null ? (
          <View style={styles.editor}>
            <Text variant="titleLarge">Reclama tu nombre de usuario</Text>
            <Text variant="bodySmall" color="secondary">
              Necesitas un nombre de usuario público para tener perfil competitivo, aparecer en Clasificación y que otros puedan verte.
            </Text>
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
        ) : null}
        {view.publicProfile !== null ? (
          <View style={styles.editor}>
            <Text variant="bodySmall" color="secondary">
              {visibility?.status === 'ready'
                ? visibility.profile.visibilityStatus === 'VISIBLE'
                  ? 'Tu perfil es visible públicamente.'
                  : 'Tu perfil es privado -- no aparece para otros usuarios.'
                : 'Cargando visibilidad de tu perfil…'}
            </Text>
            {toggleVisibilityError ? (
              <Text variant="bodySmall" color="error">
                {toggleVisibilityError}
              </Text>
            ) : null}
            {visibility?.status === 'error' ? (
              <Text variant="bodySmall" color="error">
                {visibility.message}
              </Text>
            ) : null}
            <Button
              label={visibility?.status === 'ready' && visibility.profile.visibilityStatus === 'VISIBLE' ? 'Hacer privado' : 'Hacer público'}
              accessibilityLabel={visibility?.status === 'ready' && visibility.profile.visibilityStatus === 'VISIBLE' ? 'Hacer perfil privado' : 'Hacer perfil público'}
              onPress={handleToggleVisibility}
              loading={togglingVisibility}
              disabled={visibility?.status !== 'ready'}
              variant="secondary"
              size="small"
            />
          </View>
        ) : null}
        <CompetitiveProfileSection profile={view.publicProfile} />
        <AcademicSummarySection summary={view.academicSummary} />
        <CompetitiveHistorySection history={view.competitiveHistory} />
        <CosmeticsSection />
        <TitlesSection />
      </ScrollView>

      {/*
        Handoff UI-3 §6: "Ver cómo me ven otros" -> secondary, "Cerrar
        sesión" -> tertiary -- explícito, no se preserva el rojo que tenía
        antes (`Button` tampoco tiene una variante "outline destructivo"
        para reproducirlo).
      */}
      <Button
        label="Cerrar sesión"
        accessibilityLabel="Cerrar sesión"
        onPress={auth.logout}
        variant="tertiary"
        size="small"
        style={styles.logoutButton}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, paddingHorizontal: spacing.space6, paddingTop: spacing.space6, backgroundColor: t.color.background.default },
    scroll: { flex: 1 },
    scrollContent: { gap: spacing.space3, paddingBottom: spacing.space4 },
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
    previewButton: { alignSelf: 'flex-start' as const },
    logoutButton: { marginTop: spacing.space3, alignSelf: 'center' as const, marginBottom: spacing.space4 },
  };
}
