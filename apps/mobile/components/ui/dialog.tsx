import type { ReactNode } from 'react';
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
  title?: string;
  message?: string;
  /**
   * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- generalización
   * del shell existente (Modal + overlay + card) para admitir contenido
   * arbitrario (p. ej. un panel de Ajustes con varias filas/acciones
   * internas), en vez de crear un primitivo paralelo. 100% retrocompatible:
   * los call-sites existentes (`title`+`message`+`primaryAction`, sin
   * `children`) se comportan exactamente igual que antes. Cuando se pasa
   * `children`, sustituye a `message` (ambos son opcionales y pueden
   * combinarse si hiciera falta -- `message` se renderiza primero).
   */
  children?: ReactNode;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  onRequestClose: () => void;
}

/** Modal de confirmación/panel compacto -- título opcional, mensaje/contenido, acciones primaria/secundaria/destructiva opcionales, cierre predecible. */
export function Dialog({ visible, title, message, children, primaryAction, secondaryAction, onRequestClose }: DialogProps) {
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
          {title ? (
            <Text variant="heading3" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text variant="body" color="secondary">
              {message}
            </Text>
          ) : null}
          {children}
          {primaryAction || secondaryAction ? (
            <View style={{ gap: spacing.space2, marginTop: spacing.space2 }}>
              {primaryAction ? (
                <Button
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  variant={primaryAction.variant ?? 'primary'}
                />
              ) : null}
              {secondaryAction ? (
                <Button
                  label={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  variant={secondaryAction.variant ?? 'tertiary'}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
