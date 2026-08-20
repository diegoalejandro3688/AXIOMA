import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, radii, spacing, layout } from '../../theme';
import type { IconName } from '../../theme';
import { Text } from './text';
import { Icon } from './icon';
import { IconButton } from './icon-button';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: IconName;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  showCounter?: boolean;
}

/**
 * Etiqueta persistente + input + placeholder + icono inicial opcional +
 * acción final opcional (contraseña) + ayuda/error + contador opcional.
 * Estados `empty/filled/focused/error/disabled/readOnly`.
 */
export function TextField({
  label,
  helperText,
  errorText,
  leadingIcon,
  disabled = false,
  readOnly = false,
  secureTextEntry,
  maxLength,
  showCounter = false,
  value,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const tokens = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const hasError = Boolean(errorText);
  const isPassword = Boolean(secureTextEntry);

  const borderColor = hasError
    ? tokens.color.state.error.border
    : focused
      ? tokens.color.accent.default
      : tokens.color.border.default;

  return (
    <View style={{ gap: spacing.space1 }}>
      <Text variant="label" color="secondary">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: focused ? 2 : 1,
          borderColor,
          borderRadius: radii.medium,
          minHeight: layout.preferredTouchTarget,
          paddingHorizontal: spacing.space3,
          backgroundColor: disabled ? tokens.color.action.disabledBackground : tokens.color.background.surface,
          gap: spacing.space2,
        }}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={20} color="secondary" /> : null}
        <TextInput
          {...rest}
          value={value}
          editable={!disabled && !readOnly}
          secureTextEntry={isPassword && !revealPassword}
          maxLength={maxLength}
          placeholderTextColor={tokens.color.text.muted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 24,
            color: tokens.color.text.primary,
            paddingVertical: spacing.space3,
          }}
        />
        {isPassword ? (
          <IconButton
            name={revealPassword ? 'eye-off' : 'eye'}
            accessibilityLabel={revealPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setRevealPassword((v) => !v)}
            color="secondary"
            size={20}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {hasError ? (
          <Text variant="caption" color="error">
            {errorText}
          </Text>
        ) : helperText ? (
          <Text variant="caption" color="muted">
            {helperText}
          </Text>
        ) : (
          <View />
        )}
        {showCounter && maxLength ? (
          <Text variant="caption" color="muted">
            {(typeof value === 'string' ? value.length : 0)}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
