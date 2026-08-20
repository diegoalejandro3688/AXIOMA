import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, layout } from '../../theme';

export type ScreenVariant = 'scroll' | 'fixed' | 'immersive' | 'form';

export interface ScreenProps {
  variant?: ScreenVariant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Contenedor de pantalla -- variantes `scroll/fixed/immersive/form`, resuelve fondo, área segura y margen horizontal 16. */
export function Screen({ variant = 'scroll', children, style }: ScreenProps) {
  const tokens = useTheme();
  const backgroundColor = tokens.color.background.default;

  if (variant === 'immersive') {
    return <View style={[{ flex: 1, backgroundColor }, style]}>{children}</View>;
  }

  const inner =
    variant === 'scroll' ? (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: layout.marginHorizontal, paddingBottom: layout.sectionGap }}
      >
        {children}
      </ScrollView>
    ) : (
      <View style={{ flex: 1, paddingHorizontal: layout.marginHorizontal }}>{children}</View>
    );

  const content =
    variant === 'form' ? (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {inner}
      </KeyboardAvoidingView>
    ) : (
      inner
    );

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={['top', 'bottom', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}
