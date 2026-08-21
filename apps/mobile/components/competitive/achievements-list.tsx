import { View } from 'react-native';
import type { PublicAchievement } from '@axioma/contracts';
import { Text } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Logros públicos -- compartido entre el perfil propio, el de un tercero y
 * la vista previa pública. `title` es configurable (LEF Bloque V, Incremento 8)
 * para reutilizar el mismo componente tanto para el listado completo
 * (`publicAchievements`, título por defecto "Logros") como para el
 * subconjunto curado (`featuredAchievements`, título "Insignias destacadas")
 * -- mismos datos, misma forma (`PublicAchievement`), sin componente
 * paralelo.
 */
export function CompetitiveAchievementsList({ achievements, title = 'Logros' }: { achievements: PublicAchievement[]; title?: string }) {
  const styles = useThemedStyles(createStyles);
  if (achievements.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="caption" weight="bold" color="secondary" style={styles.title}>
        {title}
      </Text>
      {achievements.map((achievement) => (
        <Text key={achievement.achievementKey} variant="body">
          {achievement.name}
        </Text>
      ))}
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 6 },
    title: { textTransform: 'uppercase' as const },
  };
}
