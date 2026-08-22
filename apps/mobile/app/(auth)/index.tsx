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
 * Login real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 * `AuthProvider` habla contra el `IdentityClient` seleccionado (stub por
 * defecto -- ver ADR-0013, Decision Gate 3) + `POST /auth/session` real.
 *
 * AUTH-1A -- rediseño puramente visual sobre la captura objetivo aprobada:
 * identidad de marca compartida (`AuthBrandHeader`), íconos en los campos,
 * `ScrollView`/safe area para que quepa el contenido nuevo en pantallas
 * pequeñas. `handleSubmit`/`auth.login`/`disabled`/navegación sin ningún
 * cambio. Deliberadamente SIN requisitos de contraseña visibles (no existe
 * esa regla real) ni enlaces de Términos/Privacidad (no existen esas
 * rutas) -- ver auditoría AUTH-1.
 */
export default function LoginScreen() {
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
    const result = await auth.login(email.trim(), password);
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
            Bienvenido de vuelta
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Continúa construyendo tu progreso.
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
            placeholder="Ingresa tu contraseña"
            leadingIcon="lock"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            Olvidé mi contraseña
          </Link>

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
            icon="chevron-right"
            style={styles.submitButton}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Text variant="bodySmall" color="secondary">
              ¿Aún no tienes cuenta?
            </Text>
            <Link href="/(auth)/register" style={styles.link}>
              Crear cuenta
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
    forgotLink: { fontSize: 14, color: t.color.accent.strong, textAlign: 'right' as const },
    error: { textAlign: 'center' as const },
    submitButton: { marginTop: spacing.space2 },
    footer: { gap: spacing.space3, marginTop: spacing.space2 },
    footerDivider: { height: 1, backgroundColor: t.color.border.default },
    footerRow: { alignItems: 'center' as const, gap: spacing.space1 },
    link: { fontSize: 15, fontWeight: '700' as const, color: t.color.accent.strong },
  };
}
