import { Fragment } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemedStyles, useTheme, radii } from '../../../../theme';
import type { IconName, ThemeTokens } from '../../../../theme';
import { Text, Card, ListRow, Divider, Icon } from '../../../../components/ui';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';

/**
 * Detalle de materia -- 4 accesos del wireframe aprobado (Unidades, Recursos,
 * Práctica libre, Ensayo). Unidades y Ensayo son funcionales; Recursos y
 * Práctica libre siguen deshabilitados con "Próximamente" (aprobación de
 * alcance explícita del usuario -- ver UI-4 Gate 4; STUDY-2 solo rediseña la
 * presentación). ENSAYOS-M1-C habilitó el acceso a Ensayos (ADR-0024).
 *
 * STUDY-2 -- el icono de cada fila representa la MODALIDAD (acción dentro de
 * la materia), no la materia en sí -- antes las 4 filas repetían el mismo
 * `subjectIcon(name)`. El tono de color sigue viniendo de la materia
 * (`subjectToneColor`/`subjectToneBackground`, sin tokens nuevos) para dar
 * continuidad visual Estudio -> Materia, en vez de 4 colores arbitrarios por
 * modalidad (ver auditoría STUDY-2, punto 5).
 */
type StudyModeTile = {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  enabled: boolean;
};

const STUDY_MODE_TILES: StudyModeTile[] = [
  {
    key: 'unidades',
    label: 'Unidades',
    description: 'Contenido organizado por unidades para aprender paso a paso.',
    icon: 'study-mode-units',
    enabled: true,
  },
  {
    key: 'recursos',
    label: 'Recursos',
    description: 'Material de apoyo para reforzar tus conocimientos.',
    icon: 'study-mode-resources',
    enabled: true,
  },
  {
    key: 'practica-libre',
    label: 'Práctica libre',
    description: 'Crea tu propia práctica y mejora a tu ritmo.',
    icon: 'study-mode-practice',
    enabled: false,
  },
  {
    key: 'ensayo',
    label: 'Ensayo',
    description: 'Simulacros y ensayos para medir tu preparación.',
    icon: 'study-mode-essay',
    enabled: true,
  },
];

const TILE_ROUTE: Record<
  string,
  '/(tabs)/estudio/[subjectId]/unidades' | '/(tabs)/estudio/[subjectId]/recursos' | '/(tabs)/estudio/ensayos'
> = {
  unidades: '/(tabs)/estudio/[subjectId]/unidades',
  recursos: '/(tabs)/estudio/[subjectId]/recursos',
  ensayo: '/(tabs)/estudio/ensayos',
};

export default function SubjectDetailScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);

  // Mismo mapeo por nombre real de materia que Materias (UI-3) -- reutilizado
  // desde `lib/academic/subject-icon.ts`, nunca duplicado. Solo se usa el
  // `tone` (continuidad de color con la materia); el icono de materia en sí
  // no se repite en las filas de modalidad.
  const { tone } = subjectIcon(name ?? '');
  const tileBackground = subjectToneBackground(tokens, tone);
  const tileIconColor = subjectToneColor(tokens, tone);

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        {name ?? 'Materia'}
      </Text>
      <Text variant="bodySmall" color="secondary">
        Elige cómo quieres estudiar
      </Text>
      <Card variant="outlined" style={styles.card}>
        {STUDY_MODE_TILES.map((tile, index) => (
          <Fragment key={tile.key}>
            {index > 0 ? <Divider /> : null}
            <ListRow
              title={tile.label}
              description={tile.description}
              leading={
                <View style={[styles.iconTile, { backgroundColor: tileBackground }]}>
                  <Icon name={tile.icon} size={18} color={tileIconColor} />
                </View>
              }
              navigable={tile.enabled}
              trailing={
                tile.enabled ? undefined : (
                  <Text variant="caption" color="muted">
                    Próximamente
                  </Text>
                )
              }
              disabled={!tile.enabled}
              accessibilityLabel={tile.enabled ? tile.label : `${tile.label}, próximamente`}
              onPress={
                tile.enabled && TILE_ROUTE[tile.key]
                  ? () => router.push({ pathname: TILE_ROUTE[tile.key], params: { subjectId, name: name ?? '' } })
                  : undefined
              }
            />
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    card: { padding: 0, overflow: 'hidden' as const },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: radii.small,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
