import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemedStyles, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import { Text, Card, ListRow, Chip, Icon } from '../../../../components/ui';
import { subjectIcon } from '../../../../lib/academic/subject-icon';

/**
 * Detalle de materia -- 4 accesos del wireframe aprobado (Unidades, Recursos,
 * Práctica libre, Ensayo). Solo Unidades es funcional en Bloque IV; los otros
 * 3 se muestran deshabilitados con "Próximamente", sin navegación ni lógica
 * (aprobación de alcance explícita del usuario -- ver UI-4 Gate 4, no
 * activarlas).
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

  // Mismo mapeo por nombre real de materia que Materias (UI-3) -- reutilizado
  // desde `estudio/index.tsx` (exportado ahí), nunca duplicado.
  const { icon } = subjectIcon(name ?? '');

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        {name ?? 'Materia'}
      </Text>
      <View style={styles.list}>
        {tiles.map((tile) => (
          <Card key={tile.key} variant="outlined" style={styles.card}>
            <ListRow
              title={tile.label}
              leading={<Icon name={icon} size={20} color="secondary" />}
              navigable={tile.enabled}
              trailing={tile.enabled ? undefined : <Chip label="Próximamente" variant="disabled" />}
              disabled={!tile.enabled}
              accessibilityLabel={tile.enabled ? tile.label : `${tile.label}, próximamente`}
              onPress={
                tile.enabled
                  ? () => router.push({ pathname: '/(tabs)/estudio/[subjectId]/unidades', params: { subjectId, name: name ?? '' } })
                  : undefined
              }
            />
          </Card>
        ))}
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    list: { gap: spacing.space2 },
    card: { padding: 0, overflow: 'hidden' as const },
  };
}
