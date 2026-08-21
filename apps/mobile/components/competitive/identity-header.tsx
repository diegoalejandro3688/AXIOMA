import { Image, View } from 'react-native';
import type { CompetitiveEquippedTitle, CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from '../ui';

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
          {/*
            `username` del backend NUNCA incluye "@" (verificado contra
            `USERNAME_PATTERN` en `packages/contracts/src/user.ts`) -- el "@"
            de abajo es puramente de presentación (14-perfil-consolidado-APROBADA.png),
            nunca se antepone a un valor que ya pudiera traerlo.
          */}
          <Text variant="heading3" accessibilityRole="header">
            @{username}
          </Text>
          {equippedTitle ? (
            <Text variant="bodySmall" color="secondary">
              {equippedTitle.displayText}
            </Text>
          ) : null}
          <Text variant="caption" color="muted">
            Nivel {levelNumber}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Avatar "hero" de perfil propio -- 96x96. UI-1 no definió variantes de
 * tamaño de avatar (no existe un componente `Avatar` en `components/ui/`);
 * 96 es una aproximación razonable frente a los 56x56 anteriores para
 * acercarse a `14-perfil-consolidado-APROBADA.png` (avatar notablemente
 * más grande que el resto de usos de este mismo header en perfil de
 * terceros/preview) -- ver UI-3 Implementation Report.
 */
const AVATAR_SIZE = 96;

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12 },
    banner: { width: '100%' as const, height: 96, borderRadius: 14, backgroundColor: t.color.background.surface },
    identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    avatarWrapper: { width: AVATAR_SIZE, height: AVATAR_SIZE },
    avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
    avatarPlaceholder: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
    },
    avatarFrame: { position: 'absolute' as const, top: -8, left: -8, width: AVATAR_SIZE + 16, height: AVATAR_SIZE + 16 },
    info: { gap: 2 },
  };
}
