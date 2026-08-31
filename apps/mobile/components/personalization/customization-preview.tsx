import { Image, View } from 'react-native';
import { Text, Avatar, LevelBadge, Progress } from '../ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * PROFILE-PERSONALIZATION-REMODEL (2026-08-30) -- vista previa compacta de
 * identidad: "¿cómo se ve mi perfil ahora mismo?". Presentación pura sobre
 * datos YA equipados (cosméticos del `useCosmeticsController`, título del
 * `useTitlesController`, nivel/XP de `getLevel`, nombre del agregador de
 * perfil) compuestos por la pantalla contenedora -- este componente no pide
 * nada.
 *
 * Sin marco -> avatar limpio (el propio `Avatar` no dibuja anillo vacío).
 * Sin título -> se omite la línea. Sin banner -> superficie de marca neutra
 * (mismo criterio que `CompetitiveIdentityHeader`). Nunca muestra lápiz de
 * edición, toggle de tema ni metadata inventada.
 */
export function CustomizationPreview({
  avatarUri,
  frameUri,
  bannerUri,
  displayName,
  titleText,
  levelNumber,
  xpRatio,
  xpIntoLevel,
  xpForNextLevel,
  lifetimeXp,
}: {
  avatarUri: string | null;
  frameUri: string | null;
  bannerUri: string | null;
  displayName: string;
  titleText: string | null;
  levelNumber: number;
  xpRatio: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  lifetimeXp: number;
}) {
  const styles = useThemedStyles(createStyles);
  const tokens = useTheme();

  const xpLabel = xpForNextLevel !== null ? `${xpIntoLevel} / ${xpForNextLevel} XP` : `${lifetimeXp} XP`;

  return (
    <View style={styles.card} accessibilityLabel="Vista previa de tu identidad">
      <View style={styles.bannerLayer}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" accessibilityLabel="Banner equipado" />
        ) : (
          <View style={styles.bannerFallback} />
        )}
        <View style={styles.bannerScrim} />
      </View>

      <View style={styles.identityRow}>
        <View style={frameUri ? undefined : styles.avatarRing}>
          <Avatar avatarUri={avatarUri} frameUri={frameUri} size="large" accessibilityLabel={`Avatar de ${displayName}`} />
        </View>
        <View style={styles.identityInfo}>
          <Text variant="titleMedium" weight="bold" numberOfLines={1} style={styles.name}>
            {displayName}
          </Text>
          {titleText ? (
            <Text variant="caption" numberOfLines={1} style={styles.title}>
              {titleText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.levelRow}>
        <LevelBadge levelNumber={levelNumber} size={24} />
        <View style={styles.levelMiddle}>
          <View style={styles.levelHeader}>
            <Text variant="caption" color="secondary">
              Nivel {levelNumber}
            </Text>
            <Text variant="caption" color="secondary">
              {xpLabel}
            </Text>
          </View>
          <Progress
            value={xpRatio}
            color={tokens.color.accent.default}
            accessibilityLabel={`Progreso de nivel: ${Math.round(xpRatio * 100)}%`}
            height={6}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: {
      borderRadius: radii.large,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      overflow: 'hidden' as const,
      paddingBottom: spacing.space3,
    },
    bannerLayer: { height: 84, width: '100%' as const, position: 'relative' as const },
    bannerImage: { width: '100%' as const, height: '100%' as const },
    bannerFallback: { width: '100%' as const, height: '100%' as const, backgroundColor: t.color.accent.subtleBg },
    // Contraste legible del avatar/nombre sobre cualquier banner, en ambos temas.
    bannerScrim: { ...ABSOLUTE_FILL, backgroundColor: t.color.background.inverse + '33' },

    identityRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: spacing.space3,
      paddingHorizontal: spacing.space4,
      marginTop: -34,
    },
    avatarRing: { borderRadius: radii.full, borderWidth: 3, borderColor: t.color.background.surface, backgroundColor: t.color.background.surface },
    identityInfo: { flex: 1, paddingBottom: spacing.space1, gap: 1 },
    name: { color: t.color.text.primary },
    title: { color: t.color.accent.strong },

    levelRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2, paddingHorizontal: spacing.space4, marginTop: spacing.space2 },
    levelMiddle: { flex: 1, gap: 4 },
    levelHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  };
}

const ABSOLUTE_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
