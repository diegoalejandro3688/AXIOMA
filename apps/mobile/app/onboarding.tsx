import { Pressable, Text, View } from 'react-native';
import { useOnboarding } from '../lib/onboarding/onboarding-provider';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/**
 * Placeholder de Onboarding -- ver ADR-0009. Solo aparece la primera vez
 * (mientras `hasCompletedOnboarding` sea `false`); "Comenzar" lo marca como
 * completo y persiste esa bandera (única cosa que este paso persiste).
 */
export default function OnboardingScreen() {
  const onboarding = useOnboarding();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Bienvenido a Axioma
      </Text>
      <Text style={styles.note}>Pantalla de onboarding -- contenido real pendiente.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Completar onboarding"
        onPress={() => onboarding.complete()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Comenzar</Text>
      </Pressable>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, padding: 24, backgroundColor: t.color.background.default },
    title: { fontSize: 24, fontWeight: '700' as const, color: t.color.text.primary },
    note: { fontSize: 13, color: t.color.text.secondary, textAlign: 'center' as const },
    // Mismo par bg/texto que el resto de botones CTA ya migrados (ej. `continueButton` en Inicio) --
    // antes hardcodeado ('#111'/'#fff'), quedaba fijo en negro sin importar el tema (hallazgo de validación Android).
    button: { backgroundColor: t.color.accent.default, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
    buttonText: { color: t.color.text.onAccent, fontWeight: '600' as const },
  };
}
