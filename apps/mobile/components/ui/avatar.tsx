import { Image, View } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from './icon';

export type AvatarSize = 'small' | 'medium' | 'large' | 'hero';

/** `small` (28, listas/ranking), `medium` (56, top 3 destacado/encabezados compactos), `large` (80, reservado), `hero` (96, perfil -- mismo tamaño que el avatar existente de `CompetitiveIdentityHeader` antes de UI-5, sin cambio visual). */
const AVATAR_DIMENSION: Record<AvatarSize, number> = { small: 28, medium: 56, large: 80, hero: 96 };

/** Proporción marco/avatar heredada de `identity-header.tsx` (marco = avatar + 16 en un avatar de 96 = 96*(112/96)). */
const FRAME_RATIO = 112 / 96;

export interface AvatarProps {
  avatarUri: string | null;
  frameUri?: string | null;
  size: AvatarSize;
  accessibilityLabel?: string;
}

/**
 * Avatar circular con marco opcional superpuesto -- sin fetch, sin lógica de
 * negocio, recibe todo por props (UI-5, sección 9 del handoff).
 *
 * STABILIZATION-B8 (Polish A, decisión de producto CONGELADA) -- una
 * identidad de usuario NUNCA se renderiza como un círculo vacío. Cuando
 * `avatarUri` es `null` (p.ej. una cuenta sin AVATAR equipado, estado
 * legítimo tras retirar un histórico obsoleto en B7.3), se muestra un
 * FALLBACK DE PRESENTACIÓN: el mismo glifo de persona canónico de la app
 * (`Icon name="profile"`) centrado en el disco. Es SÓLO visual -- no crea
 * `inventory_item`, no otorga ni equipa cosmético, no toca estado de cuenta
 * ni Personalización, y no implica que la cuenta posea nada.
 */
export function Avatar({ avatarUri, frameUri, size, accessibilityLabel }: AvatarProps) {
  const tokens = useTheme();
  const dimension = AVATAR_DIMENSION[size];
  const frameDimension = Math.round(dimension * FRAME_RATIO);
  const frameOffset = (frameDimension - dimension) / 2;

  return (
    <View style={{ width: dimension, height: dimension }}>
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          accessibilityLabel={accessibilityLabel}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          accessibilityLabel={accessibilityLabel}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderWidth: 1,
            borderColor: tokens.color.border.default,
            backgroundColor: tokens.color.background.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="profile" size={Math.round(dimension * 0.56)} color="muted" />
        </View>
      )}
      {frameUri ? (
        <Image
          source={{ uri: frameUri }}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel ? `Marco de ${accessibilityLabel}` : undefined}
          style={{
            position: 'absolute',
            top: -frameOffset,
            left: -frameOffset,
            width: frameDimension,
            height: frameDimension,
          }}
        />
      ) : null}
    </View>
  );
}
