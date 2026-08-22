import { Text, View } from 'react-native';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Disclaimer del Tutor (LEF Bloque VI, Incremento 5, decisión N) -- el TEXTO
 * lo devuelve el backend (`disclaimer` en el contrato de conversación), nunca
 * se escribe aquí ni se genera con el modelo. Visible pero no invasivo: se
 * muestra UNA vez por superficie (hub y conversación), nunca uno por
 * respuesta -- `sendAiMessageResponseSchema` deliberadamente no lo incluye.
 */
export function AiDisclaimer({ text }: { text: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/**
 * AI-1A -- baja de jerarquía visual (superficie sutil/informativa, no debe
 * competir con hero/CTA): sin borde, mismo tono `state.info` pero de fondo
 * únicamente, padding reducido. Mismo texto real recibido por prop, sin
 * cambio de dato ni de comportamiento.
 */
function createStyles(t: ThemeTokens) {
  return {
    container: {
      backgroundColor: t.color.state.info.background,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    text: { fontSize: 11, color: t.color.state.info.text },
  };
}
