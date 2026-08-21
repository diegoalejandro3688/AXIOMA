import { View } from 'react-native';
import type { CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { Chip } from '../ui';
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
        <Chip key={item.itemKey} label={item.name} variant="neutral" />
      ))}
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  };
}
