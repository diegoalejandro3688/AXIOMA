import { useState } from 'react';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../lib/auth/auth-provider';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, TextField, Button } from '../../components/ui';

/**
 * Registro real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 * UI-3: migrado a primitivas de UI-1, misma plantilla visual que Login
 * (ver nota sobre el lockup en `app/(auth)/index.tsx`).
 */
export default function RegisterScreen() {
  const auth = useAuth();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await auth.register(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <View style={styles.container}>
      <Text variant="heading2" style={styles.title} accessibilityRole="header">
        Crear cuenta
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
        label="Crear cuenta"
        accessibilityLabel="Crear cuenta"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!email || !password}
        variant="primary"
        size="large"
      />
      <Link href="/(auth)" style={styles.link}>
        Volver a iniciar sesión
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
