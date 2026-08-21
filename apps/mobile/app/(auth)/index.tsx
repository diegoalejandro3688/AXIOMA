import { useState } from 'react';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../lib/auth/auth-provider';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, TextField, Button } from '../../components/ui';

/**
 * Login real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 * `AuthProvider` habla contra el `IdentityClient` seleccionado (stub por
 * defecto -- ver ADR-0013, Decision Gate 3) + `POST /auth/session` real.
 *
 * UI-3: migrado a primitivas de UI-1 (`TextField`/`Button`/`Text`). El
 * lockup vertical de Zetrynd NO se incluye -- no existe todavía como asset
 * importable en `apps/mobile` (sin pipeline de SVG-como-archivo, ver UI-3
 * Implementation Report) -- reportado como bloqueante en vez de aproximar
 * un logo.
 */
export default function LoginScreen() {
  const auth = useAuth();
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
      <Text variant="heading2" style={styles.title} accessibilityRole="header">
        Iniciar sesión
      </Text>
      <TextField
        label="Correo electrónico"
        accessibilityLabel="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Contraseña"
        accessibilityLabel="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" variant="bodySmall" color="error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label="Iniciar sesión"
        accessibilityLabel="Iniciar sesión"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!email || !password}
        variant="primary"
        size="large"
      />
      <Link href="/(auth)/register" style={styles.link}>
        Crear cuenta
      </Link>
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Olvidé mi contraseña
      </Link>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: {
      flex: 1,
      alignItems: 'stretch' as const,
      justifyContent: 'center' as const,
      gap: spacing.space3,
      padding: spacing.space6,
      backgroundColor: t.color.background.default,
    },
    title: { textAlign: 'center' as const, marginBottom: spacing.space3 },
    error: { textAlign: 'center' as const },
    link: { fontSize: 14, color: t.color.accent.strong, textAlign: 'center' as const, marginTop: spacing.space1 },
  };
}
