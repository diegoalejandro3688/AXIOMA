import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme, typeScale, fontWeight } from '../../theme';

export type RewardBurstKind = 'resource' | 'essay';

export interface RewardBurstProps {
  /** Monto a mostrar -- SIEMPRE derivado de `XP_REWARD_BY_ACTIVITY_TYPE`, nunca hardcodeado en el llamador. */
  amount: number;
  kind: RewardBurstKind;
  /** Se llama UNA vez, al terminar la animación (o el fade corto de Reduce Motion) -- el llamador desmonta el componente aquí. */
  onComplete: () => void;
}

/**
 * VC4 MICROBLOQUE 5B -- QA física del recurso encontró que el perfil
 * ORIGINAL (compartido por `resource`/`essay`, ~700-900ms, texto pequeño,
 * vuelo largo) se percibía como "una partícula diminuta" -- ilegible como
 * recompensa protagonista. `resource` ganó su PROPIO perfil, más
 * grande/calmado (aprobado por QA física), pensado para vivir dentro de un
 * completion state dedicado (`ejercicio.tsx`), no superpuesto sobre la
 * última pregunta.
 *
 * VC4 MICROBLOQUE 5E.2 -- QA física de `essay` (que SÍ seguía usando el
 * perfil original de 5, intacto a propósito en 5B) confirmó el MISMO
 * problema que ya se había resuelto para `resource`: "dura demasiado poco,
 * es demasiado pequeño, apenas se alcanza a percibir". `essay` adopta AHORA
 * la MISMA familia visual que `resource` (mismo fontSize protagonista,
 * mismo tipo de pop/hold/fly calmado) -- ligeramente más enfático/largo
 * (~2.0s vs ~1.6s, overshoot algo mayor) porque el producto lo pide
 * "ligeramente más importante" que recurso, nunca un lenguaje visual
 * distinto.
 */
const PROFILE = {
  resource: {
    fontSize: typeScale.display.fontSize, // 32 -- protagonista real, token ya existente (§4/§21: reutilizar, no inventar tamaño)
    popMs: 260,
    popOvershoot: 1.08,
    holdMs: 550,
    flyMs: 700,
    flyXRatio: 0.16, // recorrido MÁS CORTO que el original (§5) -- se alcanza a leer antes de moverse
    flyYRatio: 0.1,
  },
  essay: {
    // 5E.2 -- MISMA familia visual que resource (ya aprobada por QA física),
    // ligeramente más enfática/larga. fontSize IGUAL a resource: no existe
    // un token de `typeScale` mayor que `display` en el sistema (§5 -- "o
    // apenas mayor si el sistema tipográfico lo permite limpiamente"; no lo
    // permite sin inventar un tamaño nuevo, así que se reutiliza el mismo).
    fontSize: typeScale.display.fontSize,
    popMs: 280,
    popOvershoot: 1.14,
    holdMs: 800,
    flyMs: 900,
    flyXRatio: 0.16,
    flyYRatio: 0.1,
  },
} as const;

const POP_SETTLE_MS = 80;
const REDUCE_MOTION_FADE_MS = 220;
/**
 * §12 -- con Reduce Motion, la recompensa debe durar lo necesario para
 * LEERSE, no desaparecer instantáneamente. Se sube de 500ms (Microbloque 5)
 * a 900ms para ambos `kind` -- mejora estrictamente el camino de
 * accesibilidad de ensayo también (nunca cambia su animación normal, que
 * queda intacta arriba), consistente con §12 ("también debe durar
 * aproximadamente lo necesario para que el usuario la lea").
 */
const REDUCE_MOTION_HOLD_MS = 900;

/**
 * VC4 MICROBLOQUE 5 (+ 5B) -- feedback visual PURO de recompensa XP
 * (recurso +20, ensayo +100). NUNCA controla XP: no llama
 * `addOptimisticXp`, no toca reconciliación, no es fuente de verdad de
 * nada -- el llamador ya actualizó el overlay optimista por su cuenta
 * (mismo guard `outcome.data.resourceJustCompleted` / `result.ok`), y ESTE
 * componente sólo se monta como reacción visual a esa MISMA señal, nunca
 * al revés.
 *
 * Identidad/reset (§17 del prompt 5): este componente NO tiene estado
 * "visible" propio -- el llamador lo monta condicionalmente
 * (`{show && <RewardBurst .../>}`) y lo desmonta en `onComplete`. Sin `key`
 * explícita no puede "revivir": un remount sólo ocurre si el llamador
 * decide mostrar OTRO evento real, mismo patrón que `RewardReveal` en
 * `quick-question.tsx`. Nada se persiste.
 *
 * Concurrencia: no aplica una cola -- un recurso o un ensayo se completa
 * una vez, no dos a la vez, así que un segundo evento antes de que el
 * primero termine no es un escenario real de este flujo.
 *
 * Reduce Motion -- mismo patrón que `progress.tsx`/`answer-option.tsx`
 * (`AccessibilityInfo.isReduceMotionEnabled` + fallback sin viaje/escala):
 * con Reduce Motion activo, SIGUE apareciendo (nunca se oculta el
 * feedback), pero sólo hace un fade en el centro, con hold suficiente para
 * leerlo.
 */
export function RewardBurst({ amount, kind, onComplete }: RewardBurstProps) {
  const tokens = useTheme();
  const { width, height } = useWindowDimensions();
  const profile = PROFILE[kind];
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion) {
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: REDUCE_MOTION_FADE_MS, useNativeDriver: true }),
          Animated.delay(REDUCE_MOTION_HOLD_MS),
          Animated.timing(opacity, { toValue: 0, duration: REDUCE_MOTION_FADE_MS, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) onCompleteRef.current();
        });
        return;
      }

      // Destino: hacia la esquina superior derecha, proporcional al tamaño
      // real de ventana (§11) -- nunca coordenadas fijas de un solo dispositivo.
      const flyX = width * profile.flyXRatio;
      const flyY = -(height * profile.flyYRatio);

      Animated.sequence([
        // FASE 1 -- pop: opacity 0->1, scale overshoot -> 1.
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: profile.popMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scale, { toValue: profile.popOvershoot, duration: profile.popMs, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: POP_SETTLE_MS, useNativeDriver: true }),
          ]),
        ]),
        // FASE 2 -- hold (lectura) -- MÁS LARGO en recurso (§3) para que se alcance a leer antes de moverse.
        Animated.delay(profile.holdMs),
        // FASE 3 -- fly + fade hacia arriba-derecha (recorrido corto y calmado en recurso, §5).
        Animated.parallel([
          Animated.timing(translate, { toValue: { x: flyX, y: flyY }, duration: profile.flyMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: profile.flyMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.85, duration: profile.flyMs, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => {
        if (finished) onCompleteRef.current();
      });
    });

    return () => {
      cancelled = true;
    };
    // Intencional: corre UNA sola vez al montar (ver Microbloque 5 original
    // para el razonamiento completo -- sin cambios en 5B).
  }, []);

  return (
    // VC4 MICROBLOQUE 5F.1 -- ROOT CAUSE del burst "detrás del contenido"
    // (QA física de Ensayo): `position:'absolute'` (vía `StyleSheet.absoluteFillObject`)
    // NO garantiza pintar por encima de hermanos posteriores en el árbol --
    // en React Native, sin `zIndex` explícito, el orden de pintado sigue el
    // orden del árbol, así que un hermano SIN `position:absolute` renderizado
    // DESPUÉS (header/ScrollView/footer) igual queda por encima. `zIndex`
    // (+ `elevation` para Android, que además de sombra también reordena el
    // stacking de hermanos superpuestos) hace que ESTE componente sea overlay
    // real sin importar dónde lo monte el llamador -- corrección en el
    // componente compartido, no un parche puntual en cada pantalla.
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', zIndex: 999, elevation: 999 }]}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
          backgroundColor: tokens.color.accent.subtleBg,
          borderRadius: 999,
          // 5E.2 -- essay comparte la familia visual de resource (mismo
          // fontSize protagonista); su pill usa un padding ligeramente
          // mayor, acorde a "ligeramente más enfático" (§1/§5).
          paddingHorizontal: kind === 'essay' ? 30 : 28,
          paddingVertical: kind === 'essay' ? 18 : 16,
        }}
      >
        <Animated.Text style={{ fontSize: profile.fontSize, fontWeight: fontWeight.bold, color: tokens.color.accent.strong }}>
          +{amount} XP
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}
