import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme, spacing, layout } from '../../theme';
import type { IconName } from '../../theme';
import { Text } from './text';
import { Icon } from './icon';

export interface ListRowProps {
  title: string;
  description?: string;
  leadingIcon?: IconName;
  leading?: ReactNode;
  valueText?: string;
  navigable?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  locked?: boolean;
  accessibilityLabel?: string;
}

/** Fila de lista -- leading opcional, título, descripción/metadato, valor final, chevron/acción. */
export function ListRow({
  title,
  description,
  leadingIcon,
  leading,
  valueText,
  navigable = false,
  trailing,
  onPress,
  selected = false,
  disabled = false,
  locked = false,
  accessibilityLabel,
}: ListRowProps) {
  const tokens = useTheme();
  const isInteractive = Boolean(onPress) && !disabled && !locked;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: layout.preferredTouchTarget,
        paddingVertical: spacing.space2,
        paddingHorizontal: spacing.space4,
        gap: spacing.space3,
        backgroundColor: selected ? tokens.color.accent.subtleBg : 'transparent',
        opacity: disabled || locked ? 0.5 : 1,
      }}
    >
      {leading ?? (leadingIcon ? <Icon name={leadingIcon} size={24} color="secondary" /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="titleMedium" color="primary">
          {title}
        </Text>
        {description ? (
          <Text variant="bodySmall" color="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {valueText ? (
        <Text variant="bodySmall" color="muted">
          {valueText}
        </Text>
      ) : null}
      {trailing}
      {navigable && !trailing ? <Icon name="chevron-right" size={20} color="muted" /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected, disabled: disabled || locked }}
      style={({ pressed }) => ({ opacity: pressed && isInteractive ? 0.85 : 1 })}
    >
      {content}
    </Pressable>
  );
}
