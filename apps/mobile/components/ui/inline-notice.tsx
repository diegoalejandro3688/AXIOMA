import { View } from 'react-native';
import { useTheme, radii, spacing } from '../../theme';
import type { IconName } from '../../theme';
import { Text } from './text';
import { Icon } from './icon';

export type InlineNoticeVariant = 'info' | 'success' | 'warning' | 'error';

const iconByVariant: Record<InlineNoticeVariant, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'info',
  error: 'x-circle',
};

export interface InlineNoticeProps {
  variant?: InlineNoticeVariant;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Aviso en línea -- variantes `info/success/warning/error`, icono + texto + acción opcional. */
export function InlineNotice({ variant = 'info', message, actionLabel, onAction }: InlineNoticeProps) {
  const tokens = useTheme();
  const tone = tokens.color.state[variant];

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.space2,
        backgroundColor: tone.background,
        borderWidth: 1,
        borderColor: tone.border,
        borderRadius: radii.medium,
        padding: spacing.space3,
      }}
    >
      <Icon name={iconByVariant[variant]} size={20} color={tone.text} />
      <View style={{ flex: 1, gap: spacing.space1 }}>
        <Text variant="bodySmall" style={{ color: tone.text }}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Text
            variant="label"
            accessibilityRole="button"
            onPress={onAction}
            style={{ color: tone.text, textDecorationLine: 'underline' }}
          >
            {actionLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
