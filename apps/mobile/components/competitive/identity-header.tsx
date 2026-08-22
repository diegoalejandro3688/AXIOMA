import { Image, Pressable, View } from 'react-native';
import type { CompetitiveContext, CompetitiveEquippedTitle, CompetitiveEquippedCosmetic } from '@axioma/contracts';
import { describeMyPosition } from '../../lib/leaderboard/paginate-leaderboard';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text, Avatar, Icon, LevelBadge } from '../ui';

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
 *
 * PROFILE-3 (decisión del Product Owner, 2026-08-22) -- composición
 * horizontal: avatar/marco a la izquierda, `displayName`/`@username`/nivel
 * apilados a la derecha. `displayName` es OPCIONAL y puramente de
 * presentación (nunca pertenece al contrato público `CompetitiveProfileResponse`
 * -- por eso es opcional aquí, y `PublicProfileView`, terceros/preview,
 * nunca lo pasa).
 *
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- los dos controles
 * del hero propio dejaron de ser redundantes entre sí, cada uno con su
 * propio prop opcional:
 *
 * - `onPersonalizePress` (lápiz, junto al avatar) -> abre Personalización
 *   (apariencia: cosméticos/títulos).
 * - `onOpenSettings` (engranaje, esquina del banner -- antes tres puntos
 *   con el MISMO destino que el lápiz) -> abre el panel de Ajustes
 *   (cuenta: nombre, username/privacidad, cerrar sesión). NUNCA navega a
 *   otra pantalla -- quien lo pasa decide cómo abrir ese panel (este
 *   componente no importa `expo-router` ni conoce `Dialog`).
 *
 * Ambos son independientes y opcionales -- `PublicProfileView` (terceros/
 * preview) NO pasa ninguno de los dos, así que ningún control de edición
 * se renderiza nunca fuera del perfil propio.
 *
 * PROFILE-4 (decisión del Product Owner, 2026-08-22) -- `competitive` es
 * OPCIONAL y renderiza la liga como una fila compacta de metadata (icono +
 * texto, NUNCA una card/acción), reutilizando `describeMyPosition` (mismo
 * mapeo puro ya gateado, sin una segunda interpretación de "sin liga").
 * Cuando `competitive` es `undefined` (nunca se pasó), la fila simplemente
 * no se renderiza -- `PublicProfileView` (terceros/preview) NO pasa este
 * prop, sigue mostrando el `CompetitivePositionCard` completo tal cual
 * (asimetría intencional, ver `verify-competitive-profile-gate.ts`). Nunca
 * es pulsable -- el CTA "Ir a Competir" se retiró del perfil propio, la
 * tab bar ya da acceso permanente a Competir. `displayName` sube a
 * `heading2` (antes `titleLarge`) para ser claramente protagonista;
 * `@username` baja a `caption` para quedar secundario.
 */
export function CompetitiveIdentityHeader({
  username,
  displayName,
  avatar,
  banner,
  equippedCosmetics,
  levelNumber,
  equippedTitle,
  competitive,
  onPersonalizePress,
  onOpenSettings,
}: {
  username: string;
  displayName?: string | null;
  avatar: string | null;
  banner?: string | null;
  equippedCosmetics?: CompetitiveEquippedCosmetic[];
  levelNumber: number;
  equippedTitle: CompetitiveEquippedTitle | null;
  competitive?: CompetitiveContext | null;
  onPersonalizePress?: () => void;
  onOpenSettings?: () => void;
}) {
  const positionView = competitive !== undefined ? describeMyPosition(competitive) : null;
  const styles = useThemedStyles(createStyles);
  const frame = equippedCosmetics?.find((c) => c.cosmeticSlot === 'AVATAR_FRAME') ?? null;

  return (
    <View style={styles.container}>
      {/*
        Composición "hero" (UI-6, 14-perfil-consolidado-APROBADA.png):
        banner de fondo, avatar/marco a la izquierda del bloque de
        identidad (PROFILE-3 -- antes apilado debajo del banner completo).
      */}
      <View style={styles.hero}>
        {banner ? (
          <Image source={{ uri: banner }} style={styles.banner} resizeMode="cover" accessibilityLabel="Banner de perfil" />
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}
        {onOpenSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajustes -- nombre, privacidad, cerrar sesión"
            onPress={onOpenSettings}
            hitSlop={8}
            style={styles.bannerMenuButton}
          >
            <Icon name="settings" size={20} color="onInverse" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.identityRow}>
        <View style={[styles.avatarOverlap, frame ? null : styles.avatarOverlapRing]}>
          <Avatar avatarUri={avatar} frameUri={frame?.assetReference} size="hero" accessibilityLabel={`Avatar de ${username}`} />
          {onPersonalizePress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Personalización -- avatar, marco, banner e insignia"
              onPress={onPersonalizePress}
              hitSlop={8}
              style={styles.avatarEditButton}
            >
              <Icon name="edit" size={14} color="onAccent" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.info}>
          {/*
            `displayName` REAL, solo presentación -- la edición sigue siendo
            el mismo `TextInput` de "Configuración de perfil" (perfil/index.tsx),
            nunca tap-to-edit aquí.
          */}
          {displayName ? (
            <Text variant="heading2" numberOfLines={1} accessibilityRole="header" style={styles.displayName}>
              {displayName}
            </Text>
          ) : null}
          {/*
            `username` del backend NUNCA incluye "@" (verificado contra
            `USERNAME_PATTERN` en `packages/contracts/src/user.ts`) -- el "@"
            de abajo es puramente de presentación, nunca se antepone a un
            valor que ya pudiera traerlo.
          */}
          <Text variant={displayName ? 'caption' : 'heading3'} color={displayName ? 'secondary' : undefined} numberOfLines={1} accessibilityRole={displayName ? undefined : 'header'}>
            @{username}
          </Text>
          {equippedTitle ? (
            <Text variant="bodySmall" color="secondary" numberOfLines={1}>
              {equippedTitle.displayText}
            </Text>
          ) : null}
          {/* PROFILE-1 -- reutiliza el mismo `LevelBadge` de HOME-ASSET-1 (gráfico estático + número real superpuesto), sin crear un asset de nivel nuevo. */}
          <View style={styles.levelRow}>
            <LevelBadge levelNumber={levelNumber} size={26} />
            <Text variant="caption" color="muted">
              Nivel {levelNumber}
            </Text>
          </View>
          {/*
            PROFILE-4 -- liga como metadata compacta, NUNCA una card/acción
            (el CTA "Ir a Competir" se retiró del perfil propio -- la tab
            bar ya da acceso permanente). Solo se renderiza cuando el
            llamador pasó `competitive` explícitamente (perfil propio);
            terceros/preview no lo pasan y siguen con el card completo.
          */}
          {positionView ? (
            <View style={styles.leagueRow}>
              <Icon name="shield" size={14} color="muted" />
              <Text variant="caption" color="muted" numberOfLines={1}>
                {positionView.kind === 'known' ? positionView.leagueName : 'Sin liga activa'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Mitad del tamaño `hero` del `Avatar` (96/2) -- desplaza la fila de identidad para que el avatar quede a caballo del borde inferior del banner. */
const HERO_AVATAR_OVERLAP = 48;

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 8 },
    hero: { width: '100%' as const, position: 'relative' as const },
    banner: { width: '100%' as const, height: 120, borderRadius: 14, backgroundColor: t.color.background.surface },
    /** Placeholder neutral cuando `banner` es `null` -- mismo contenedor vacío, nunca una imagen inventada (UI-5, criterio A.2). */
    bannerPlaceholder: { width: '100%' as const, height: 120, borderRadius: 14, backgroundColor: t.color.accent.subtleBg },
    /** PROFILE-5B -- acceso a Ajustes sobre el banner (antes tres puntos -> Personalización, ahora engranaje -> Ajustes); nunca se renderiza sin `onOpenSettings` (perfil de terceros/preview). */
    bannerMenuButton: {
      position: 'absolute' as const,
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    /**
     * PROFILE-5A (decisión del Product Owner, 2026-08-22) -- FIX: PROFILE-3
     * había puesto el `marginTop` negativo en ESTA fila completa, con
     * `alignItems:'center'`. Eso funcionaba mientras el bloque de texto
     * (`info`) era más bajo que el avatar (96px) -- pero desde que ganó
     * `displayName` en `heading2` + `@username` + Nivel + liga compacta,
     * `info` pasó a ser MÁS alto que el avatar. Centrar un contenido más
     * alto dentro de una fila ya desplazada -48px empuja la MITAD superior
     * de ese contenido (el propio `displayName`) por ENCIMA del borde
     * superior de la fila -- que ya estaba dentro del banner. De ahí el bug
     * real reportado (displayName renderizando sobre el banner), no un
     * simple problema de offset.
     *
     * Fix estructural (no un parche de offset): la fila vuelve a flujo
     * normal, justo DEBAJO del banner, con `alignItems:'flex-start'` -- el
     * bloque `info` arranca siempre exactamente donde termina el banner,
     * sin importar cuánto texto tenga. El desplazamiento -48px se mueve a
     * `avatarOverlap` (ver abajo), afectando SOLO al avatar -- mismo
     * patrón que usaba PROFILE-1/2 antes de la composición horizontal.
     */
    identityRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginLeft: 16,
      gap: 12,
    },
    /**
     * ASSET-2 -- posicionamiento puro, SIN dibujar nada por sí solo. El
     * anillo de separación (`avatarOverlapRing`, abajo) solo se aplica sin
     * marco equipado: con marco, cualquier disco/borde detrás quedaba
     * expuesto como un halo claro en el hueco donde el arte del marco no
     * llega exactamente al radio de este contenedor (variable por asset,
     * nunca garantizado por el código) -- confirmado con madera, plata y
     * Bronce V2 durante el diagnóstico de ASSET-2.
     *
     * PROFILE-5A -- `marginTop` negativo VUELVE aquí (solo el avatar
     * "sube" a caballo del banner; el texto de al lado ya no lo acompaña,
     * ver `identityRow`).
     */
    avatarOverlap: {
      position: 'relative' as const,
      marginTop: -HERO_AVATAR_OVERLAP,
      borderRadius: 999,
    },
    /** Anillo de separación avatar/banner (commit 5eb1822) -- SOLO sin marco equipado; con marco, el propio marco ya aporta el contorno visual. */
    avatarOverlapRing: {
      borderWidth: 3,
      borderColor: t.color.background.default,
      backgroundColor: t.color.background.default,
    },
    /**
     * PROFILE-3 -- lápiz asociado al avatar, referencia inicial
     * bottom:-4/right:-4 (a calibrar físicamente si tapa demasiado el
     * marco equipado). Fuera del área de recorte de 96px del `Avatar` --
     * nunca modifica su composición/crop interno.
     */
    avatarEditButton: {
      position: 'absolute' as const,
      bottom: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.color.accent.default,
      borderWidth: 2,
      borderColor: t.color.background.default,
    },
    info: { flex: 1, gap: 2 },
    displayName: { color: t.color.text.primary },
    levelRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 2 },
    leagueRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 2 },
  };
}
