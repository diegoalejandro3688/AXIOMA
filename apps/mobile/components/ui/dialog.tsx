import { Modal, View } from 'react-native';
import { useTheme, radii, spacing } from '../../theme';
import { Text } from './text';
import { Button } from './button';
import type { ButtonVariant } from './button';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'danger' | 'tertiary'>;
}

export interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  primaryAction: DialogAction;
  secondaryAction?: DialogAction;
  onRequestClose: () => void;
}

/** Modal de confirmación -- título, mensaje, acción primaria/secundaria/destructiva, cierre predecible. */
export function Dialog({ visible, title, message, primaryAction, secondaryAction, onRequestClose }: DialogProps) {
  const tokens = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.space6,
        }}
      >
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: tokens.color.background.surface,
            borderRadius: radii.large,
            padding: spacing.space5,
            gap: spacing.space3,
          }}
        >
          <Text variant="heading3" accessibilityRole="header">
            {title}
          </Text>
          {message ? (
            <Text variant="body" color="secondary">
              {message}
            </Text>
          ) : null}
          <View style={{ gap: spacing.space2, marginTop: spacing.space2 }}>
            <Button
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant ?? 'primary'}
            />
            {secondaryAction ? (
              <Button
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                variant={secondaryAction.variant ?? 'tertiary'}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
