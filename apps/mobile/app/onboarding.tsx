import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOnboarding } from '../lib/onboarding/onboarding-provider';

/**
 * Placeholder de Onboarding -- ver ADR-0009. Solo aparece la primera vez
 * (mientras `hasCompletedOnboarding` sea `false`); "Comenzar" lo marca como
 * completo y persiste esa bandera (única cosa que este paso persiste).
 */
export default function OnboardingScreen() {
  const onboarding = useOnboarding();

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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  note: { fontSize: 13, color: '#666', textAlign: 'center' },
  button: { backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
