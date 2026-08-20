import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme, spacing, layout } from '../../theme';
import { Text } from './text';
import { IconButton } from './icon-button';

export type ScreenHeaderVariant = 'root' | 'inner';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  variant?: ScreenHeaderVariant;
  onBack?: () => void;
  onClose?: () => void;
  action?: ReactNode;
}

/** Encabezado de pantalla -- título, subtítulo opcional, acción volver/cerrar, una acción contextual a la derecha. */
export function ScreenHeader({ title, subtitle, variant = 'root', onBack, onClose, action }: ScreenHeaderProps) {
  const tokens = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: layout.marginHorizontal,
        paddingVertical: spacing.space3,
        backgroundColor: tokens.color.background.default,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.space2,
      }}
    >
      {onBack ? (
        <IconButton name="back-arrow" accessibilityLabel="Volver" onPress={onBack} />
      ) : onClose ? (
        <IconButton name="close" accessibilityLabel="Cerrar" onPress={onClose} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant={variant === 'root' ? 'heading2' : 'titleLarge'} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
