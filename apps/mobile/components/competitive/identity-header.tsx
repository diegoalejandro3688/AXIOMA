import { Image, Text, View } from 'react-native';
import type { CompetitiveEquippedTitle, CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Cabecera de identidad competitiva -- compartida entre el perfil PROPIO
 * (`app/(tabs)/perfil/index.tsx`), el de un TERCERO (`competir/perfil/[username].tsx`)
 * y la vista previa pública (`components/competitive/public-profile-view.tsx`,
 * LEF Bloque V, Incremento 8). Ver docs/adr/LEF-BLOCK-IV-DEFINITION.md,
 * Incremento 5, sub-incremento 5.c -- evita duplicar el mismo JSX en las
 * tres pantallas.
 *
 * `banner`/`equippedCosmetics` son OPCIONALES (LEF Bloque V, Incremento 1 --
 * `banner` no existía en el contrato hasta esa enmienda de ADR-0021) --
 * `undefined` se trata igual que ausente, sin banner ni marco. El marco de
 * avatar es el cosmético equipado en el slot `AVATAR_FRAME` dentro de
 * `equippedCosmetics` -- este componente solo lo busca para presentación,
 * nunca decide equipamiento (eso es `CosmeticsSection`, con escritura real).
 */
export function CompetitiveIdentityHeader({
  username,
  avatar,
  banner,
  equippedCosmetics,
  levelNumber,
  equippedTitle,
}: {
  username: string;
  avatar: string | null;
  banner?: string | null;
  equippedCosmetics?: CompetitiveEquippedCosmetic[];
  levelNumber: number;
  equippedTitle: CompetitiveEquippedTitle | null;
}) {
  const styles = useThemedStyles(createStyles);
  const frame = equippedCosmetics?.find((c) => c.cosmeticSlot === 'AVATAR_FRAME') ?? null;

  return (
    <View style={styles.container}>
      {banner ? <Image source={{ uri: banner }} style={styles.banner} resizeMode="cover" accessibilityLabel="Banner de perfil" /> : null}
      <View style={styles.identityRow}>
        <View style={styles.avatarWrapper}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarPlaceholder} />}
          {frame ? <Image source={{ uri: frame.assetReference }} style={styles.avatarFrame} resizeMode="contain" accessibilityLabel={`Marco: ${frame.name}`} /> : null}
        </View>
        <View style={styles.info}>
          <Text style={styles.username} accessibilityRole="header">
            {username}
          </Text>
          {equippedTitle ? <Text style={styles.title}>{equippedTitle.displayText}</Text> : null}
          <Text style={styles.level}>Nivel {levelNumber}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12 },
    banner: { width: '100%' as const, height: 96, borderRadius: 14, backgroundColor: t.color.background.surface },
    identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    avatarWrapper: { width: 56, height: 56 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: t.color.border.default, backgroundColor: t.color.background.surface },
    avatarFrame: { position: 'absolute' as const, top: -6, left: -6, width: 68, height: 68 },
    info: { gap: 2 },
    username: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    title: { fontSize: 13, color: t.color.text.secondary },
    level: { fontSize: 12, color: t.color.text.muted },
  };
}
