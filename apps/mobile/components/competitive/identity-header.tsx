import { Image, View } from 'react-native';
import type { CompetitiveEquippedTitle, CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, Avatar } from '../ui';

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
      {/*
        Composición "hero" (UI-6, 14-perfil-consolidado-APROBADA.png):
        banner de fondo con el Avatar superpuesto sobre su borde inferior,
        en vez de dos bloques apilados (UI-5). Mismos datos/fallbacks que
        antes -- solo cambia la composición visual.
      */}
      <View style={styles.hero}>
        {banner ? (
          <Image source={{ uri: banner }} style={styles.banner} resizeMode="cover" accessibilityLabel="Banner de perfil" />
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}
        <View style={[styles.avatarOverlap, frame ? null : styles.avatarOverlapRing]}>
          <Avatar avatarUri={avatar} frameUri={frame?.assetReference} size="hero" accessibilityLabel={`Avatar de ${username}`} />
        </View>
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
  );
}

/** Mitad del tamaño `hero` del `Avatar` (96/2) -- desplaza el avatar para que quede a caballo del borde inferior del banner. */
const HERO_AVATAR_OVERLAP = 48;

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 8 },
    hero: { width: '100%' as const },
    banner: { width: '100%' as const, height: 120, borderRadius: 14, backgroundColor: t.color.background.surface },
    /** Placeholder neutral cuando `banner` es `null` -- mismo contenedor vacío, nunca una imagen inventada (UI-5, criterio A.2). */
    bannerPlaceholder: { width: '100%' as const, height: 120, borderRadius: 14, backgroundColor: t.color.accent.subtleBg },
    /**
     * ASSET-2 -- posicionamiento puro, SIN dibujar nada por sí solo. El
     * anillo de separación (`avatarOverlapRing`, abajo) solo se aplica sin
     * marco equipado: con marco, cualquier disco/borde detrás quedaba
     * expuesto como un halo claro en el hueco donde el arte del marco no
     * llega exactamente al radio de este contenedor (variable por asset,
     * nunca garantizado por el código) -- confirmado con madera, plata y
     * Bronce V2 durante el diagnóstico de ASSET-2.
     */
    avatarOverlap: {
      marginTop: -HERO_AVATAR_OVERLAP,
      marginLeft: 16,
      alignSelf: 'flex-start' as const,
      borderRadius: 999,
    },
    /** Anillo de separación avatar/banner (commit 5eb1822) -- SOLO sin marco equipado; con marco, el propio marco ya aporta el contorno visual. */
    avatarOverlapRing: {
      borderWidth: 3,
      borderColor: t.color.background.default,
      backgroundColor: t.color.background.default,
    },
    info: { gap: 2, paddingLeft: 16 },
  };
}
