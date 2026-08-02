import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { UserProfileResponse } from '@axioma/contracts';
import { useAuth } from '../../lib/auth/auth-provider';
import { getProfile, initializeProfile, updateProfile } from '../../lib/api/user';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'needs-init' }
  | { status: 'ready'; profile: UserProfileResponse };

/** Perfil real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009). GET/POST/PATCH /user/profile (ADR-0008). */
export default function PerfilScreen() {
  const auth = useAuth();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getProfile();
    if (result.ok) {
      setDisplayName(result.data.displayName);
      setState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      setState({ status: 'needs-init' });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInitialize() {
    setSaveError(null);
    setSaving(true);
    const result = await initializeProfile({ displayName: displayName.trim() });
    setSaving(false);
    if (result.ok) setState({ status: 'ready', profile: result.data });
    else setSaveError(result.message);
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    const result = await updateProfile({ displayName: displayName.trim() });
    setSaving(false);
    if (result.ok) setState({ status: 'ready', profile: result.data });
    else setSaveError(result.message);
  }

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Perfil
      </Text>

      <TextInput
        accessibilityLabel="Nombre a mostrar"
        placeholder="Nombre a mostrar"
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
      />
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      {state.status === 'needs-init' ? (
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
          <Text style={styles.meta}>Zona horaria: {state.profile.timezone}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            onPress={handleSave}
            disabled={saving || !displayName.trim() || displayName === state.profile.displayName}
            style={[
              styles.saveButton,
              (saving || !displayName.trim() || displayName === state.profile.displayName) && styles.buttonDisabled,
            ]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
          </Pressable>
        </>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={auth.logout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15 },
  error: { color: '#c00', fontSize: 13 },
  meta: { fontSize: 13, color: '#666' },
  saveButton: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  logoutButton: {
    marginTop: 'auto',
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c00',
  },
  logoutButtonText: { color: '#c00', fontWeight: '600' },
});
