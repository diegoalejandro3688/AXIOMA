import { View } from 'react-native';
import { useTheme, radii, spacing } from '../../theme';
import { Text } from '../ui/text';
import { Icon } from '../ui/icon';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.1.
 *
 * Distintivo `[lock] Premium` para contenido bloqueado cuando la cuenta es
 * FREE. Componente PROPIO -- NO extiende ni modifica `Chip` (no acepta
 * icono). Sin `opacity` sobre el badge: va a contraste pleno con los tokens
 * `state.warning` (ambar/dorado) ya en uso (tono Historia, "cuota agotada").
 *
 * Su fondo `state.warning.background` es del propio badge; la atenuacion del
 * tile decorativo de la card es aparte (Capa 2, C2.2 -- tono calibrado en QA
 * Samsung).
 */
export function PremiumBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const tokens = useTheme();
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Contenido Premium"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.space1,
        backgroundColor: tokens.color.state.warning.background,
        borderRadius: radii.full,
        paddingHorizontal: spacing.space2,
        paddingVertical: spacing.space1,
      }}
    >
      <Icon name="lock" size={iconSize} color={tokens.color.state.warning.text} />
      <Text variant="label" style={{ color: tokens.color.state.warning.text }}>
        Premium
      </Text>
    </View>
  );
}
