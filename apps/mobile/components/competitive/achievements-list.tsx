import { Text, View } from 'react-native';
import type { PublicAchievement } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/** Logros públicos -- compartido entre el perfil propio y el de un tercero. */
export function CompetitiveAchievementsList({ achievements }: { achievements: PublicAchievement[] }) {
  const styles = useThemedStyles(createStyles);
  if (achievements.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logros</Text>
      {achievements.map((achievement) => (
        <Text key={achievement.achievementKey} style={styles.achievement}>
          {achievement.name}
        </Text>
      ))}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 6 },
    title: { fontSize: 13, fontWeight: '700' as const, color: t.color.text.secondary, textTransform: 'uppercase' as const },
    achievement: { fontSize: 14, color: t.color.text.primary },
  };
}
