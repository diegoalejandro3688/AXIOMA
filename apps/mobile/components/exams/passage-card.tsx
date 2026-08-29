import { Pressable, View } from 'react-native';
import type { ExamPassageView } from '@axioma/contracts';
import { PassageContentRenderer } from './passage-content-renderer';
import { Text } from '../ui';
import { useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * ENSAYOS-F2 -- tarjeta del texto de lectura compartido, justo ENCIMA del
 * enunciado de la pregunta actual. Se muestra SOLO cuando la pregunta tiene
 * `passageId`. El texto se renderiza una única vez por pregunta a partir del
 * `passage` ya resuelto en `response.passages` (este componente no busca ni
 * deduplica -- eso lo hace la pantalla).
 *
 * `collapsed` / `onToggle` los controla la pantalla (un `Record<passageId,
 * boolean>` a nivel de pantalla), NUNCA un segundo índice mutable de pregunta:
 * `currentIndex` sigue siendo la única selección mutable del flujo (M1-D/D2).
 *
 * El contenido colapsable evita ScrollViews verticales anidados: el texto
 * fluye dentro del ScrollView de la pregunta, así que un texto largo se
 * desplaza con el resto de la pantalla y las alternativas + el footer siguen
 * siendo alcanzables.
 */
export function PassageCard({
  passage,
  collapsed,
  onToggle,
}: {
  passage: ExamPassageView;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text variant="label" color="secondary" style={styles.eyebrow}>
          TEXTO {passage.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Ver texto' : 'Ocultar texto'}
          onPress={onToggle}
          hitSlop={8}
        >
          <Text variant="bodySmall" color="secondary" weight="bold">
            {collapsed ? 'Ver texto' : 'Ocultar texto'}
          </Text>
        </Pressable>
      </View>
      {collapsed ? null : (
        <View style={styles.body}>
          <PassageContentRenderer content={passage.content} />
        </View>
      )}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: radii.medium,
      backgroundColor: t.color.background.surface,
      padding: spacing.space3,
      gap: spacing.space2,
    },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.space2,
    },
    eyebrow: { flex: 1, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    body: { gap: spacing.space2 },
  };
}
