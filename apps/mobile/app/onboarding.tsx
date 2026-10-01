import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '../lib/onboarding/onboarding-provider';
import { ZetryndMark } from '../components/auth/zetrynd-mark';
import { AuthMeshDecoration } from '../components/auth/auth-mesh-decoration';
import { Text, Button, Icon } from '../components/ui';
import type { IconName } from '../theme';
import { useThemedStyles, spacing, radii } from '../theme';
import type { ThemeTokens } from '../theme';

interface Benefit {
  icon: IconName;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  { icon: 'study', title: 'Estudia a tu ritmo', description: 'Avanza por materias y refuerza lo que necesites.' },
  { icon: 'study-mode-practice', title: 'Pon a prueba lo que sabes', description: 'Practica con preguntas y ensayos.' },
  { icon: 'ai', title: 'Sigue mejorando', description: 'Revisa tu progreso y apóyate en Tutor IA.' },
];

/**
 * VC4 MICROBLOQUE 7 -- Onboarding, pulido visual (ver ADR-0009 para la
 * máquina de estados que lo alcanza/persiste, sin cambios aquí). Sigue
 * siendo UNA sola pantalla, un solo CTA ("Comenzar" -> `onboarding.complete()`),
 * misma persistencia local (`hasCompletedOnboarding`) -- únicamente cambia
 * la composición visual/copy.
 *
 * Reutiliza la identidad de marca YA APROBADA de Auth (AUTH-1A): mismo
 * símbolo oficial (`ZetryndMark`, aspect ratio 1:1 fijo -- nunca se deforma,
 * ver su propio docstring) y la misma textura de fondo extremadamente sutil
 * (`AuthMeshDecoration`, `pointerEvents="none"`). No se creó ningún asset,
 * icono ni componente de marca nuevo.
 *
 * Los 3 beneficios usan iconos YA registrados en `theme/icons` (mismos que
 * la tab bar / selector de modalidad de Estudio) -- ninguno nuevo.
 *
 * Estático (sin animación): RC prioriza estabilidad sobre motion nuevo
 * (§14 del prompt) -- no se introdujo infraestructura de animación para
 * esta pantalla.
 */
export default function OnboardingScreen() {
  const onboarding = useOnboarding();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screen}>
      <AuthMeshDecoration />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.space8, paddingBottom: insets.bottom + spacing.space4 }]}
      >
        <View style={styles.hero}>
          <ZetryndMark size={88} />
          <Text variant="heading1" accessibilityRole="header" style={styles.title}>
            Bienvenido a ZETRYND
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Prepárate para la PAES practicando, estudiando y midiendo tu progreso en un solo lugar.
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitRow}>
              <View style={styles.benefitIconTile}>
                <Icon name={benefit.icon} size={22} color="accent" />
              </View>
              <View style={styles.benefitText}>
                <Text variant="titleMedium">{benefit.title}</Text>
                <Text variant="bodySmall" color="secondary">
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.space4 }]}>
        <Button
          label="Comenzar"
          accessibilityLabel="Completar onboarding"
          onPress={() => onboarding.complete()}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default },
    content: { flexGrow: 1, paddingHorizontal: spacing.space6, gap: spacing.space8 },
    hero: { alignItems: 'center' as const, gap: spacing.space3 },
    title: { textAlign: 'center' as const },
    subtitle: { textAlign: 'center' as const, paddingHorizontal: spacing.space2 },
    benefits: { gap: spacing.space5 },
    benefitRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: spacing.space3 },
    benefitIconTile: {
      width: 44,
      height: 44,
      borderRadius: radii.medium,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.color.accent.subtleBg,
    },
    benefitText: { flex: 1, gap: 2, paddingTop: 2 },
    // Footer fijo fuera del ScrollView -- el CTA nunca queda inalcanzable
    // aunque el contenido crezca (pantallas pequeñas / fuentes grandes).
    footer: { paddingHorizontal: spacing.space6, paddingTop: spacing.space3, backgroundColor: t.color.background.default },
    cta: { width: '100%' as const },
  };
}
