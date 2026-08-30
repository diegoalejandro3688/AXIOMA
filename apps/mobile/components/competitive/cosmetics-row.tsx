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
  // COSMETICS-V1 §22 -- el slot BADGE queda fuera de la superficie productiva.
  // El contrato API no cambia; solo se filtra la presentación.
  const visible = equippedCosmetics.filter((item) => item.cosmeticSlot !== 'BADGE');
  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {visible.map((item) => (
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
