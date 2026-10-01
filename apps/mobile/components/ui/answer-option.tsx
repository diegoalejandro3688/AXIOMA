import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { useTheme, radii, spacing, layout } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from './text';

export type AnswerOptionState = 'default' | 'selected' | 'submitting' | 'correct' | 'incorrect' | 'disabled';

export interface AnswerOptionProps {
  /** Contenido de la alternativa -- normalmente `ContentBlockRenderer`, inyectado por el llamador. Sin lógica de negocio aquí. */
  children: ReactNode;
  /** Prefijo tipo "A)" (Ejercicio) -- opcional, Pregunta rápida no lo usa. */
  label?: string;
  state: AnswerOptionState;
  onPress: () => void;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'radio';
  accessibilityLabel: string;
}

const RESULT_TRANSITION_DURATION_MS = 170;

/**
 * VC4 (motion pass) -- únicamente las transiciones HACIA `correct`/
 * `incorrect` se suavizan (el objetivo explícito del bloque). El resto de
 * transiciones de `state` (default/selected/submitting/disabled) siguen
 * siendo un cambio instantáneo, como antes.
 */
function isResultState(state: AnswerOptionState): boolean {
  return state === 'correct' || state === 'incorrect';
}

/**
 * Fila de alternativa reutilizable entre Ejercicio y Pregunta rápida (.md
 * 8.23) -- presentación pura: recibe el estado ya calculado por el
 * llamador (`isSelected`, `answered?.isCorrect`, etc.) y un callback,
 * nunca decide corrección ni envía nada por su cuenta. `accessibilityRole`
 * es configurable porque ambos flujos difieren en semántica de
 * accesibilidad (Ejercicio = "button", Pregunta rápida = "radio").
 *
 * VC4 (motion pass) -- la transición HACIA `correct`/`incorrect` ya no es un
 * salto de color instantáneo: una capa (`Animated.View`) con el color NUEVO
 * se superpone sobre el contenedor (que sigue mostrando el color ANTERIOR
 * debajo) y aparece con un fundido de `opacity` (`useNativeDriver: true`) --
 * nunca se anima `backgroundColor`/`borderColor` directamente. El color
 * FINAL, una vez completada la transición, es exactamente el mismo definido
 * por `containerStyle` -- esta capa solo decide CÓMO se llega a él, nunca
 * QUÉ color es. API, layout, tamaños y comportamiento táctil intactos.
 */
export function AnswerOption({
  children,
  label,
  state,
  onPress,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
}: AnswerOptionProps) {
  const tokens = useTheme();
  const isSubmittingThis = state === 'submitting';
  const isInteractionDisabled = disabled || state === 'correct' || state === 'incorrect' || state === 'disabled';

  // Capa "base" (por debajo): el color YA asentado -- arranca igual a `state`
  // (sin animar el primer render) y solo avanza hasta alcanzar el estado
  // actual cuando una transición correct/incorrect termina.
  const settledStateRef = useRef<AnswerOptionState>(state);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const previous = settledStateRef.current;
    if (previous === state) return;

    if (!isResultState(state)) {
      // Cualquier transición que NO sea hacia correct/incorrect sigue siendo
      // instantánea, como antes de este cambio.
      settledStateRef.current = state;
      overlayOpacity.setValue(1);
      forceRerender((n) => n + 1);
      return;
    }

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        settledStateRef.current = state;
        overlayOpacity.setValue(1);
        forceRerender((n) => n + 1);
        return;
      }
      overlayOpacity.setValue(0);
      forceRerender((n) => n + 1); // repinta la capa base con el color ANTERIOR antes de animar.
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: RESULT_TRANSITION_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) settledStateRef.current = state;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const baseVisualState = settledStateRef.current;
  const overlayVisualState = state;
  const showOverlay = baseVisualState !== overlayVisualState;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInteractionDisabled, selected: state === 'selected' || state === 'submitting' }}
      disabled={isInteractionDisabled}
      onPress={onPress}
      style={[containerStyle(tokens, baseVisualState), { minHeight: layout.minTouchTarget }]}
    >
      {showOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={[
            resultOverlayStyle(tokens, overlayVisualState),
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: overlayOpacity },
          ]}
        />
      ) : null}
      {label ? (
        // STUDY-5 -- identificador circular A/B/C/D (antes texto plano "A)").
        // Rama exclusiva de Ejercicio: Pregunta rápida (Competir) nunca pasa
        // `label`, así que este cambio no le afecta. Tono `accent` fijo,
        // independiente de `state`, igual para las 4 alternativas -- el
        // color de corrección sigue viviendo únicamente en el contenedor
        // (`containerStyle`), nunca en el identificador.
        <View style={{ width: 32, height: 32, borderRadius: radii.full, backgroundColor: tokens.color.accent.subtleBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="label" weight="semibold" style={{ color: tokens.color.accent.strong }}>
            {label}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
      {isSubmittingThis ? <ActivityIndicator size="small" color={tokens.color.accent.default} /> : null}
    </Pressable>
  );
}

function containerStyle(t: ThemeTokens, state: AnswerOptionState) {
  const base = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.space2,
    padding: spacing.space3,
    borderRadius: radii.medium,
    borderWidth: 1,
  };
  switch (state) {
    case 'correct':
      return { ...base, backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border };
    case 'incorrect':
      return { ...base, backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border };
    case 'submitting':
      return { ...base, backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border };
    case 'selected':
      return { ...base, backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default };
    case 'disabled':
      return { ...base, backgroundColor: t.color.action.disabledBackground, borderColor: t.color.action.disabledBorder };
    default:
      return { ...base, backgroundColor: t.color.background.surface, borderColor: t.color.border.default };
  }
}

/** Mismo color que `containerStyle` para `correct`/`incorrect` -- solo el subconjunto de propiedades necesario para la capa superpuesta (sin layout/padding, que ya aporta el contenedor debajo). */
function resultOverlayStyle(t: ThemeTokens, state: AnswerOptionState) {
  const style = containerStyle(t, state);
  return { backgroundColor: style.backgroundColor, borderColor: style.borderColor, borderWidth: style.borderWidth, borderRadius: style.borderRadius };
}
