import { Text, View } from 'react-native';
import type { CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Cosméticos equipados -- SOLO LECTURA (a diferencia de `CosmeticsSection`,
 * que es el selector de la propia cuenta). Compartido entre el perfil
 * propio y el de un tercero -- ver identity-header.tsx.
 */
export function CompetitiveCosmeticsRow({ equippedCosmetics }: { equippedCosmetics: CompetitiveEquippedCosmetic[] }) {
  const styles = useThemedStyles(createStyles);
  if (equippedCosmetics.length === 0) return null;

  return (
    <View style={styles.container}>
      {equippedCosmetics.map((item) => (
        <View key={item.itemKey} style={styles.chip}>
          <Text style={styles.chipText}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    chip: { backgroundColor: t.color.background.surface, borderWidth: 1, borderColor: t.color.border.default, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    chipText: { fontSize: 12, color: t.color.text.secondary },
  };
}
