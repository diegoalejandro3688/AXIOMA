import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAds } from '../../lib/ads/ads-provider';
import { useAuth } from '../../lib/auth/auth-provider';
import { useOnboarding } from '../../lib/onboarding/onboarding-provider';
import { Button, Text, TextField } from '../ui';
import { layout, spacing, useTheme } from '../../theme';

/**
 * ADS V1 -- PRE-PLAY. Pantalla de edad NEUTRAL (fecha de nacimiento escrita libremente).
 *
 * NEUTRAL por diseno: sin umbral de edad en el texto, sin fecha preseleccionada, sin
 * pistas de que respuesta "califica" y sin mensajes distintos segun el resultado.
 * La fecha se evalua SOLO en el dispositivo (ver `useAds().submitBirthDate`); aqui los
 * campos viven en estado local del componente y se descartan al cerrar. Nada se envia
 * a la API ni se registra.
 *
 * Solo se muestra a un usuario FREE autenticado, con onboarding completo y edad aun
 * sin respuesta. "Ahora no" cierra la pantalla esta sesion SIN dar edad: la app sigue
 * sin anuncios (fail-closed) y se vuelve a preguntar en el proximo arranque.
 */
export function AgeScreenHost() {
  const ads = useAds();
  const auth = useAuth();
  const onboarding = useOnboarding();
  const visible = ads.agePromptRequired && auth.status === 'authenticated' && onboarding.status === 'complete';
  if (!visible) return null;
  return <AgeScreen onSubmit={ads.submitBirthDate} onSkip={ads.skipAgePrompt} />;
}

function AgeScreen({ onSubmit, onSkip }: { onSubmit: (fields: { day: string; month: string; year: string }) => 'ok' | 'invalid'; onSkip: () => void }) {
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const outcome = onSubmit({ day, month, year });
    if (outcome === 'invalid') setInvalid(true);
    // 'ok': el proveedor resuelve la edad y este componente se desmonta; los campos se descartan.
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onSkip}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tokens.color.background.default }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            gap: spacing.space4,
            paddingHorizontal: layout.marginHorizontal,
            paddingTop: insets.top + spacing.space6,
            paddingBottom: insets.bottom + spacing.space6,
          }}
        >
          <Text variant="heading2" accessibilityRole="header">
            Tu fecha de nacimiento
          </Text>
          <Text variant="body" color="secondary">
            Usamos tu fecha de nacimiento, solo en este dispositivo, para configurar la experiencia de la app, incluida la publicidad. No se envía a nuestros servidores.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.space3 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Día"
                value={day}
                onChangeText={(v) => {
                  setDay(v.replace(/\D/g, ''));
                  setInvalid(false);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Mes"
                value={month}
                onChangeText={(v) => {
                  setMonth(v.replace(/\D/g, ''));
                  setInvalid(false);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <TextField
                label="Año"
                value={year}
                onChangeText={(v) => {
                  setYear(v.replace(/\D/g, ''));
                  setInvalid(false);
                }}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="AAAA"
              />
            </View>
          </View>
          {invalid ? (
            <Text variant="bodySmall" color="error" accessibilityRole="alert">
              Revisa la fecha ingresada.
            </Text>
          ) : null}
          <Button label="Continuar" onPress={submit} disabled={day.length === 0 || month.length === 0 || year.length !== 4} />
          <Button label="Ahora no" variant="tertiary" onPress={onSkip} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
