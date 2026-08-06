import { Image, Text, View } from 'react-native';
import type { CompetitiveEquippedTitle } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Cabecera de identidad competitiva -- compartida entre el perfil PROPIO
 * (`components/competitive-profile-section.tsx`, dentro de `perfil.tsx`) y
 * el de un TERCERO (`competir/perfil/[username].tsx`). Ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md, Incremento 5, sub-incremento 5.c --
 * evita duplicar el mismo JSX en ambas pantallas.
 */
export function CompetitiveIdentityHeader({
  username,
  avatar,
  levelNumber,
  equippedTitle,
}: {
  username: string;
  avatar: string | null;
  levelNumber: number;
  equippedTitle: CompetitiveEquippedTitle | null;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarPlaceholder} />}
      <View style={styles.info}>
        <Text style={styles.username} accessibilityRole="header">
          {username}
        </Text>
        {equippedTitle ? <Text style={styles.title}>{equippedTitle.displayText}</Text> : null}
        <Text style={styles.level}>Nivel {levelNumber}</Text>
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: t.color.border.default, backgroundColor: t.color.background.surface },
    info: { gap: 2 },
    username: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    title: { fontSize: 13, color: t.color.text.secondary },
    level: { fontSize: 12, color: t.color.text.muted },
  };
}
