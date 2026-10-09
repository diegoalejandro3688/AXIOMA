import { useRef, useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth/auth-provider';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, TextField, Button } from '../../components/ui';
import { AuthBrandHeader } from '../../components/auth/auth-brand-header';
import { AuthMeshDecoration } from '../../components/auth/auth-mesh-decoration';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Recuperación de contraseña -- Firebase Auth maneja el flujo completo
 * (correo con enlace alojado por Firebase); no hay endpoint de backend.
 * La confirmación es NEUTRA a propósito: no revela si existe una cuenta con
 * ese correo (`auth/user-not-found` se trata como éxito en `AuthProvider`).
 * Misma plantilla visual que Login/Register.
 */
export default function ForgotPasswordScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);

  async function handleSubmit() {
    if (inFlight.current || !emailValid) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    const result = await auth.resetPassword(trimmedEmail);
    setSubmitting(false);
    inFlight.current = false;
    if (result.ok) setSent(true);
    else setError(result.message);
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
            Recuperar contraseña
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
          </Text>
        </View>

        {sent ? (
          <View style={styles.successBox} accessibilityLiveRegion="polite">
            <Text variant="body" style={styles.successText}>
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              label="Correo electrónico"
              accessibilityLabel="Correo electrónico"
              placeholder="correo@ejemplo.com"
              leadingIcon="mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
            />

            {error ? (
              <Text accessibilityLiveRegion="polite" variant="bodySmall" color="error" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button
              label="Enviar enlace"
              accessibilityLabel="Enviar enlace"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!emailValid || submitting}
              variant="primary"
              size="large"
              icon="chevron-right"
              style={styles.submitButton}
            />
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Link href="/(auth)" style={styles.link}>
              Volver a iniciar sesión
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
    successBox: {
      padding: spacing.space4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.color.state.success.border,
      backgroundColor: t.color.state.success.background,
    },
    successText: { color: t.color.state.success.text, textAlign: 'center' as const },
    footer: { gap: spacing.space3, marginTop: spacing.space2 },
    footerDivider: { height: 1, backgroundColor: t.color.border.default },
    footerRow: { alignItems: 'center' as const, gap: spacing.space1 },
    link: { fontSize: 15, fontWeight: '700' as const, color: t.color.accent.strong },
  };
}
