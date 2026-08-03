import { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../lib/auth/auth-provider';
import { useTheme, useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Login real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 * `AuthProvider` habla contra el `IdentityClient` seleccionado (stub por
 * defecto -- ver ADR-0013, Decision Gate 3) + `POST /auth/session` real.
 */
export default function LoginScreen() {
  const auth = useAuth();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await auth.login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Iniciar sesión
      </Text>
      <TextInput
        accessibilityLabel="Correo electrónico"
        placeholder="Correo electrónico"
        placeholderTextColor={tokens.color.text.muted}
        selectionColor={tokens.color.accent.default}
        cursorColor={tokens.color.accent.default}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Contraseña"
        placeholder="Contraseña"
        placeholderTextColor={tokens.color.text.muted}
        selectionColor={tokens.color.accent.default}
        cursorColor={tokens.color.accent.default}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
        style={[styles.button, (submitting || !email || !password) && styles.buttonDisabled]}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
      </Pressable>
      <Link href="/(auth)/register" style={styles.link}>
        Crear cuenta
      </Link>
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Olvidé mi contraseña
      </Link>
    </View>
  );
}

/** Alcance mínimo (ver ADR-0015): solo `container`/`title` pasan por tokens. */
function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, alignItems: 'stretch' as const, justifyContent: 'center' as const, gap: 12, padding: 24, backgroundColor: t.color.background.default },
    title: { fontSize: 24, fontWeight: '700' as const, textAlign: 'center' as const, marginBottom: 12, color: t.color.text.primary },
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
    error: { color: '#c00', fontSize: 13, textAlign: 'center' as const },
    button: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 8, alignItems: 'center' as const, marginTop: 8 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#fff', fontWeight: '600' as const },
    link: { fontSize: 14, color: '#0a58ca', textAlign: 'center' as const, marginTop: 4 },
  };
}
