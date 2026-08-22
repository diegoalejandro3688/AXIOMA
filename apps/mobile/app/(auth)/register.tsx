import { useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth/auth-provider';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, TextField, Button } from '../../components/ui';
import { AuthBrandHeader } from '../../components/auth/auth-brand-header';
import { AuthMeshDecoration } from '../../components/auth/auth-mesh-decoration';

/**
 * Registro real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 *
 * AUTH-1A -- misma plantilla visual que Login (`AuthBrandHeader` compartido,
 * ver nota en `app/(auth)/index.tsx`). `handleSubmit`/`auth.register`/
 * `disabled`/navegación sin cambios. Sin requisitos de contraseña visibles
 * ni enlaces de Términos/Privacidad -- no existen esas reglas/rutas reales
 * (ver auditoría AUTH-1); no se compensa la omisión con contenido nuevo.
 */
export default function RegisterScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
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
    <View style={styles.screen}>
      <AuthMeshDecoration />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.space6, paddingBottom: insets.bottom + spacing.space6 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthBrandHeader />

        <View style={styles.formHeader}>
          <Text variant="heading2" style={styles.title} accessibilityRole="header">
            Crea tu cuenta
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Empieza tu camino en Zetrynd.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Correo electrónico"
            accessibilityLabel="Correo electrónico"
            placeholder="correo@ejemplo.com"
            leadingIcon="mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Contraseña"
            accessibilityLabel="Contraseña"
            placeholder="Crea una contraseña segura"
            leadingIcon="lock"
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
            icon="chevron-right"
            style={styles.submitButton}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Text variant="bodySmall" color="secondary">
              ¿Ya tienes una cuenta?
            </Text>
            <Link href="/(auth)" style={styles.link}>
              Iniciar sesión
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default },
    content: { flexGrow: 1, gap: spacing.space6, paddingHorizontal: spacing.space6 },
    formHeader: { gap: spacing.space1 },
    title: { textAlign: 'center' as const },
    subtitle: { textAlign: 'center' as const },
    form: { gap: spacing.space3 },
    error: { textAlign: 'center' as const },
    submitButton: { marginTop: spacing.space2 },
    footer: { gap: spacing.space3, marginTop: spacing.space2 },
    footerDivider: { height: 1, backgroundColor: t.color.border.default },
    footerRow: { alignItems: 'center' as const, gap: spacing.space1 },
    link: { fontSize: 15, fontWeight: '700' as const, color: t.color.accent.strong },
  };
}
