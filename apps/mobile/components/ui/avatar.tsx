import { Image, View } from 'react-native';
import { useTheme } from '../../theme';

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
 * negocio, recibe todo por props (UI-5, sección 9 del handoff). Placeholder
 * circular con borde `border.default` cuando `avatarUri` es `null`, mismo
 * criterio que ya usaba `identity-header.tsx` antes de extraerse aquí.
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
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderWidth: 1,
            borderColor: tokens.color.border.default,
            backgroundColor: tokens.color.background.surface,
          }}
        />
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
