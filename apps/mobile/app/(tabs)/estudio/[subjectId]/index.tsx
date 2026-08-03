import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemedStyles } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

/**
 * Detalle de materia -- 4 accesos del wireframe aprobado (Unidades, Recursos,
 * Práctica libre, Ensayo). Solo Unidades es funcional en Bloque IV; los otros
 * 3 se muestran deshabilitados con "Próximamente", sin navegación ni lógica
 * (aprobación de alcance explícita del usuario).
 */
export default function SubjectDetailScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const tiles: { key: string; label: string; enabled: boolean }[] = [
    { key: 'unidades', label: 'Unidades', enabled: true },
    { key: 'recursos', label: 'Recursos', enabled: false },
    { key: 'practica-libre', label: 'Práctica libre', enabled: false },
    { key: 'ensayo', label: 'Ensayo', enabled: false },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {name ?? 'Materia'}
      </Text>
      <View style={styles.list}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            disabled={!tile.enabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !tile.enabled }}
            accessibilityLabel={tile.enabled ? tile.label : `${tile.label}, próximamente`}
            style={[styles.row, !tile.enabled && styles.rowDisabled]}
            onPress={() =>
              tile.enabled &&
              router.push({ pathname: '/(tabs)/estudio/[subjectId]/unidades', params: { subjectId, name: name ?? '' } })
            }
          >
            <Text style={[styles.rowLabel, !tile.enabled && styles.rowLabelDisabled]}>{tile.label}</Text>
            {tile.enabled ? (
              <Text style={styles.chevron}>›</Text>
            ) : (
              <Text style={styles.comingSoon}>Próximamente</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    title: { fontSize: 22, fontWeight: '700' as const, color: t.color.text.primary },
    list: { gap: 10 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: t.color.background.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: t.color.border.default,
    },
    rowDisabled: { backgroundColor: t.color.action.disabledBackground, borderColor: t.color.action.disabledBorder },
    rowLabel: { fontSize: 14, color: t.color.text.primary },
    rowLabelDisabled: { color: t.color.action.disabledText },
    chevron: { fontSize: 16, color: t.color.text.secondary },
    comingSoon: { fontSize: 11, fontWeight: '500' as const, color: t.color.action.disabledText },
  };
}
