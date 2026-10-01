import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestionResponse, ResourceContentBlockResponse, TopicProgressResponse } from '@axioma/contracts';
import { listPublishedQuestions } from '../../../../../lib/api/education';
import { getTopicProgress } from '../../../../../lib/api/progress';
import { submitResponseViaOutbox } from '../../../../../lib/progress/submit-response';
import { armStudyProgressReconciliation } from '../../../../../lib/progress/study-progress-reconciliation';
import { addOptimisticXp, XP_REWARD_BY_ACTIVITY_TYPE } from '../../../../../lib/progress/instant-xp-store';
import { syncPendingOperations } from '../../../../../lib/offline/sync-worker';
import { isPremiumRequiredError, isPremiumRequiredOutcome } from '../../../../../lib/entitlement/premium-error';
import { PremiumLockedScreen } from '../../../../../components/premium/premium-locked-screen';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../../components/content-block-renderer';
import { IconButton, Text, Button, AnswerOption, Icon, RewardBurst, Card } from '../../../../../components/ui';
import type { AnswerOptionState } from '../../../../../components/ui';
import { useTheme, useThemedStyles, spacing, radii, borders } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';

/** `isCorrect: null` = respondida localmente, pendiente de confirmación del servidor (ver ADR-0014, punto 5). */
interface AnsweredState {
  answerOptionId: string;
  isCorrect: boolean | null;
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'premium' }
  | { status: 'ready'; questions: QuestionResponse[]; topicStatus: TopicProgressResponse['status']; answers: Record<string, AnsweredState> };

/**
 * Ejercicio -- segundo paso del recorrido. Se alcanza cuando la unidad ya
 * tiene al menos una respuesta (ver `resolve-continuation.ts`, ADR-0014).
 * Una pregunta por pantalla (wireframe aprobado): `displayedQuestionVersionId`
 * es independiente de "primera pregunta no respondida" -- así, al responder,
 * la pantalla se queda mostrando la retroalimentación de ESA pregunta hasta
 * que el estudiante pulsa "Continuar", en vez de saltar a la siguiente en el
 * mismo render y ocultar el resultado antes de que pueda verlo.
 */
export default function EjercicioScreen() {
  const { topicId, subjectId, name, unitId, unitName, origin } = useLocalSearchParams<{
    topicId: string;
    subjectId: string;
    name?: string;
    unitId?: string;
    unitName?: string;
    /** VC4 MICROBLOQUE 6.1 -- 'resources' cuando se entró por la biblioteca
     * "Recursos" (nunca inferido). Ver `resourceFlowNav`. */
    origin?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const tokens = useTheme();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [displayedQuestionVersionId, setDisplayedQuestionVersionId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // VC4 MICROBLOQUE 5/5B -- feedback visual puro, MISMA señal que ya dispara
  // el overlay optimista de XP (`resourceJustCompleted`, ver `handleSelect`).
  // `key` incremental evita que un remount accidental reproduzca el burst.
  const [resourceBurst, setResourceBurst] = useState<{ key: number } | null>(null);
  const burstKeyRef = useRef(0);
  // §10/§14 -- el resumen ("Recurso completado" + score) se revela DESPUÉS
  // de que termina el burst. Arranca en `true` (reentrada a un recurso YA
  // completo: nunca hay burst que esperar, el resumen debe verse de
  // inmediato) -- SOLO se pone en `false` en el instante de un completion
  // NUEVO real (ver `handleSelect`), nunca por defecto.
  const [summaryRevealed, setSummaryRevealed] = useState(true);
  // VC4 MICROBLOQUE 6 -- Repasar recurso (HARD READ-ONLY, §7 del prompt).
  // Nunca persistido (§13): arranca en `false`/`0` y `load()` los reinicia
  // explícitamente en CADA reentrada -- reabrir el recurso SIEMPRE muestra
  // el summary primero, nunca entra a Repaso automáticamente.
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    setSubmitError(null);
    // Disparador "montaje de pantalla" del worker offline (ADR-0014, punto 5).
    await syncPendingOperations();

    const [questionsResult, progressResult] = await Promise.all([
      listPublishedQuestions(topicId),
      getTopicProgress(topicId),
    ]);

    // PREMIUM V1 (C2.2) -- deep-link / ruta restaurada al ejercicio de una
    // unidad >= 2 con la cuenta en FREE: `403 PREMIUM_REQUIRED` en la lectura.
    // El path de escritura (`submitResponseViaOutbox`) no aplica: una cuenta
    // FREE nunca llega a responder aquí.
    if (isPremiumRequiredError(questionsResult) || isPremiumRequiredError(progressResult)) {
      setState({ status: 'premium' });
      return;
    }
    if (!questionsResult.ok) {
      setState({ status: 'error', message: questionsResult.message });
      return;
    }
    if (!progressResult.ok) {
      setState({ status: 'error', message: progressResult.message });
      return;
    }

    const answers: Record<string, AnsweredState> = {};
    for (const response of progressResult.data.responses) {
      answers[response.questionVersionId] = { answerOptionId: response.answerOptionId, isCorrect: response.isCorrect };
    }

    const firstUnanswered = questionsResult.data.find((question) => !answers[question.versionId]);
    const completedNow = !firstUnanswered;
    setDisplayedQuestionVersionId(firstUnanswered?.versionId ?? null);
    setShowCompleted(completedNow);
    // VC4 MICROBLOQUE 6 -- §8/§13: toda (re)carga vuelve al summary, nunca a
    // Repaso -- EXCEPTO la entrada explícita 6.1 desde "Recursos" (§8/§11:
    // recurso completado abierto desde Recursos entra DIRECTO a Repaso, sin
    // summary intermedio). El guard usa `completedNow`, derivado del estado
    // AUTORITATIVO recién cargado (`getTopicProgress`/`answers`), NUNCA sólo
    // el param del cliente (§19 -- un `origin=resources` sobre un recurso que
    // en realidad no está completo cae al flujo normal de estudio, no a
    // Repaso).
    setReviewMode(origin === 'resources' && completedNow);
    setReviewIndex(0);

    setState({ status: 'ready', questions: questionsResult.data, topicStatus: progressResult.data.status, answers });
  }, [topicId, origin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(question: QuestionResponse, answerOptionId: string) {
    if (state.status !== 'ready') return;
    if (state.answers[question.versionId]) return; // ya respondida -- inmutable (ADR-0014).
    setSubmitError(null);
    setSubmitting(true);

    const outcome = await submitResponseViaOutbox({
      curriculumTopicId: topicId,
      questionVersionId: question.versionId,
      answerOptionId,
    });

    setSubmitting(false);

    // PREMIUM V1 (C2.2) -- una cuenta PREMIUM pudo abrir este ejercicio de
    // U3+ y luego hacer downgrade / vencer la suscripcion con la pantalla
    // abierta. La escritura nueva la rechaza C1.4 con `403 PREMIUM_REQUIRED`.
    // NUNCA se trata como exito; la operacion ya quedo FAILED en el outbox
    // (4xx -> permanente, ver `flushOperation`), no se reintenta; la pantalla
    // pasa al lock. Un fallo de red conserva su semantica offline (PENDING).
    if (isPremiumRequiredOutcome(outcome)) {
      setState({ status: 'premium' });
      return;
    }

    // STABILIZATION-B8 (Polish F) -- el servidor ACEPTÓ la respuesta: se
    // producirá una actividad de estudio (RESPUESTA_VALIDADA, y
    // RECURSO_COMPLETADO/TEMA_COMPLETADO si esto completó el recurso/tema),
    // cuyo XP + evaluación de Desafíos llega de forma asíncrona (~1.5-2.5 min).
    // Se "arma" la ventana de reconciliación para que Inicio/Competir
    // muestren "Actualizando progreso…" y refresquen de forma acotada.
    // NUNCA se fabrica XP ni contadores aquí. Sólo en el camino ACEPTADO
    // (`outcome.kind === 'ok'`) -- una operación en cola offline no arma nada.
    if (outcome.kind === 'ok') {
      armStudyProgressReconciliation();
      // VC4 (Instant Progress, follow-up) -- overlay optimista INMEDIATO:
      // RESPUESTA_VALIDADA siempre se produce en una respuesta aceptada.
      // TEMA_COMPLETADO/RECURSO_COMPLETADO usan las señales REALES que el
      // backend ahora expone (`topicJustCompleted`/`resourceJustCompleted`,
      // ver `ProgressService.submitResponse` -- ya las calculaba
      // internamente, solo faltaba devolverlas). Nunca `topicStatus`
      // (puede seguir en COMPLETED en un replay sin que ESTA llamada haya
      // completado nada -- habría duplicado XP local en ese caso).
      addOptimisticXp(XP_REWARD_BY_ACTIVITY_TYPE.RESPUESTA_VALIDADA);
      if (outcome.data.topicJustCompleted) {
        addOptimisticXp(XP_REWARD_BY_ACTIVITY_TYPE.TEMA_COMPLETADO);
      }
      if (outcome.data.resourceJustCompleted) {
        addOptimisticXp(XP_REWARD_BY_ACTIVITY_TYPE.RECURSO_COMPLETADO);
        // VC4 MICROBLOQUE 5B -- burst visual, MISMA condición que la línea
        // de arriba, nunca una fuente de verdad propia. `key` incremental
        // (no el mismo valor fijo) para que dos completions reales
        // consecutivas (escenario ya de por sí infrecuente) siempre
        // remonten limpio.
        burstKeyRef.current += 1;
        setResourceBurst({ key: burstKeyRef.current });
        // §13 -- NO esperar al tap "Continuar" sobre la última pregunta: el
        // completion state aparece de inmediato, con el burst YA dentro de
        // él (nunca superpuesto sobre la pregunta). El resumen (§10/§14)
        // se revela recién, dentro de esa pantalla, cuando el burst termina.
        setShowCompleted(true);
        setSummaryRevealed(false);
      }
    }

    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      if (outcome.kind === 'ok') {
        return {
          ...prev,
          topicStatus: outcome.data.topicStatus,
          answers: { ...prev.answers, [question.versionId]: { answerOptionId: outcome.data.answerOptionId, isCorrect: outcome.data.isCorrect } },
        };
      }
      if (outcome.kind === 'conflict') {
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [question.versionId]: { answerOptionId: outcome.existingResponse.answerOptionId, isCorrect: outcome.existingResponse.isCorrect },
          },
        };
      }
      if ((outcome.kind === 'network' || (outcome.kind === 'error' && outcome.status >= 500)) && Platform.OS !== 'web') {
        return { ...prev, answers: { ...prev.answers, [question.versionId]: { answerOptionId, isCorrect: null } } };
      }
      return prev;
    });

    if (outcome.kind === 'error' && outcome.status < 500) {
      setSubmitError(outcome.message);
    } else if (outcome.kind === 'network' && Platform.OS === 'web') {
      setSubmitError('No se pudo enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.');
    } else if (outcome.kind === 'error' && outcome.status >= 500 && Platform.OS === 'web') {
      setSubmitError('El servidor no pudo procesar la respuesta. Inténtalo de nuevo.');
    }
    // `displayedQuestionVersionId` deliberadamente NO cambia aquí -- la
    // pantalla se queda en esta pregunta mostrando su retroalimentación
    // hasta que el estudiante pulse "Continuar" (ver `handleContinue`).
  }

  function handleContinue() {
    if (state.status !== 'ready') return;
    const next = state.questions.find((question) => !state.answers[question.versionId]);
    if (next) {
      setDisplayedQuestionVersionId(next.versionId);
    } else {
      setShowCompleted(true);
    }
  }

  // STUDY CONTENT MOBILE REACHABILITY -- vuelve a la lista de Recursos de la
  // Unidad cuando se entró por ahí (`unitId` presente); si se entró directo
  // desde "Continuar estudiando" en Inicio, cae a la lista de unidades.
  function backToUnidades() {
    if (unitId) {
      router.push({
        pathname: '/(tabs)/estudio/[subjectId]/unidad/[unitId]',
        params: { subjectId, unitId, name: name ?? '', unitName: unitName ?? '' },
      });
      return;
    }
    router.push({ pathname: '/(tabs)/estudio/[subjectId]/unidades', params: { subjectId, name: name ?? '' } });
  }

  // VC4 MICROBLOQUE 6.1 -- §16: "Salir del repaso" respeta el ORIGEN
  // explícito. Un repaso alcanzado vía `origin=resources` vuelve a la
  // biblioteca "Recursos" (el recurso ya se vio, no hace falta re-mostrar el
  // summary intermedio); cualquier otro origen (Unidades/CTA del summary)
  // sigue volviendo al summary local, comportamiento ya aprobado.
  function backToRecursos() {
    router.push({ pathname: '/(tabs)/estudio/[subjectId]/recursos', params: { subjectId, name: name ?? '' } });
  }
  const exitReview = origin === 'resources' ? backToRecursos : () => setReviewMode(false);

  if (state.status === 'loading') return <LoadingState message="Cargando preguntas…" />;
  if (state.status === 'premium') return <PremiumLockedScreen origin="unit" onBack={backToUnidades} />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.questions.length === 0) {
    return <EmptyState message="Todavía no hay preguntas publicadas para esta unidad." actionLabel="Volver a la unidad" onAction={backToUnidades} />;
  }

  if (showCompleted) {
    // §8/§9 -- fuente LOCAL y fiable: `state.answers` viene de
    // `getTopicProgress` (autoritativo) y se actualiza en vivo por
    // respuesta; cada pregunta tiene COMO MÁXIMO una respuesta INMUTABLE
    // (ADR-0014) -- nunca cuenta replays ni preguntas de otro recurso.
    const totalCount = state.questions.length;
    const correctCount = state.questions.filter((question) => state.answers[question.versionId]?.isCorrect === true).length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // VC4 MICROBLOQUE 6 -- Repasar recurso: rama COMPLETAMENTE separada del
    // summary (§12 -- "los elementos interactivos que pueden escribir
    // simplemente NO se montan en review mode"). `RewardBurst`/`CompletionSummary`
    // (que a su vez es lo único que puede disparar `backToUnidades`/burst)
    // NUNCA se renderizan aquí -- no son alcanzables desde este árbol, no
    // hace falta un guard condicional adicional dentro de ellos.
    if (reviewMode) {
      return (
        <ReviewScreen
          questions={state.questions}
          answers={state.answers}
          reviewIndex={reviewIndex}
          setReviewIndex={setReviewIndex}
          onExit={exitReview}
          insets={insets}
          styles={styles}
        />
      );
    }

    return (
      <View style={[styles.completedScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {resourceBurst ? (
          <RewardBurst
            key={resourceBurst.key}
            amount={XP_REWARD_BY_ACTIVITY_TYPE.RECURSO_COMPLETADO}
            kind="resource"
            onComplete={() => {
              setResourceBurst(null);
              setSummaryRevealed(true);
            }}
          />
        ) : null}
        <CompletionSummary
          visible={summaryRevealed}
          correctCount={correctCount}
          totalCount={totalCount}
          percentage={percentage}
          tokens={tokens}
          styles={styles}
          continueLabel={origin === 'resources' ? 'Volver a Recursos' : 'Volver a Unidades'}
          onContinue={origin === 'resources' ? backToRecursos : backToUnidades}
          onReview={
            origin === 'resources'
              ? () => {
                  setReviewIndex(0);
                  setReviewMode(true);
                }
              : undefined
          }
        />
      </View>
    );
  }

  const currentQuestion = state.questions.find((question) => question.versionId === displayedQuestionVersionId) ?? null;
  if (!currentQuestion) return <LoadingState message="Cargando pregunta…" />;

  const answeredCount = state.questions.filter((question) => state.answers[question.versionId]).length;
  const totalSteps = 1 + state.questions.length; // 1 = paso de Recurso ya completado.
  const currentStep = 1 + answeredCount;
  const questionIndex = state.questions.findIndex((question) => question.versionId === currentQuestion.versionId);
  const answered = state.answers[currentQuestion.versionId];
  const isAnswered = !!answered;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Cerrar ejercicio" onPress={backToUnidades} color="secondary" />
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel={`Paso ${currentStep} de ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View key={index} style={[styles.progressSegment, index < currentStep ? styles.progressSegmentDone : styles.progressSegmentPending]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color="secondary" style={styles.questionNumber}>
          Pregunta {questionIndex + 1} de {state.questions.length}
        </Text>
        <StemContent blocks={currentQuestion.stemContent} />
        <Text variant="bodySmall" color="secondary">
          Selecciona la alternativa correcta.
        </Text>

        {submitError ? (
          <Text variant="bodySmall" color="error">
            {submitError}
          </Text>
        ) : null}

        <View style={styles.options}>
          {currentQuestion.answerOptions.map((option, optionIndex) => {
            const isSelected = answered?.answerOptionId === option.id;
            let optionState: AnswerOptionState = 'default';
            if (isSelected && answered?.isCorrect === true) optionState = 'correct';
            else if (isSelected && answered?.isCorrect === false) optionState = 'incorrect';
            else if (isSelected && answered?.isCorrect === null) optionState = 'submitting';
            else if (submitting && isSelected) optionState = 'submitting';

            return (
              <AnswerOption
                key={option.id}
                label={String.fromCharCode(65 + optionIndex)}
                state={optionState}
                disabled={isAnswered || submitting}
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                onPress={() => handleSelect(currentQuestion, option.id)}
              >
                <ContentBlockRenderer blocks={[option.content]} />
              </AnswerOption>
            );
          })}
        </View>

        {answered && answered.isCorrect === null ? (
          <Text variant="caption" color="secondary" style={styles.pendingNote}>
            Guardada localmente -- pendiente de sincronizar.
          </Text>
        ) : null}

        {answered && answered.isCorrect !== null ? (
          <View style={[styles.feedback, answered.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Text weight="bold" color={answered.isCorrect ? 'success' : 'error'}>
              {answered.isCorrect ? 'Correcto' : 'Incorrecto'}
            </Text>
            <ContentBlockRenderer blocks={currentQuestion.explanationContent} />
            {/*
              Acceso contextual al Tutor IA -- LEF Bloque VI, Incremento 8
              (punto de entrada 2, §28). Solo se envía el IDENTIFICADOR de la
              versión de pregunta: el backend resuelve por su cuenta materia,
              tema, alternativa elegida, corrección y explicación desde sus
              fuentes canónicas (`AiAcademicContextBuilder`). Mobile NUNCA
              envía `correctAnswer`/`isCorrect`/explicación/progreso.
              Deliberadamente aparece solo DESPUÉS de responder (la
              retroalimentación ya está revelada), sin alterar en nada el
              flujo del ejercicio.
            */}
            <Button
              variant="tertiary"
              icon="ai"
              label="Preguntar al Tutor IA"
              accessibilityLabel="Preguntar al Tutor IA sobre esta pregunta"
              onPress={() => router.push({ pathname: '/(tabs)/ia', params: { contextQuestionVersionId: currentQuestion.versionId } })}
              style={styles.tutorButton}
            />
          </View>
        ) : null}
      </ScrollView>

      {answered && answered.isCorrect !== null ? (
        <Button variant="primary" label="Continuar" onPress={handleContinue} style={styles.continueButton} />
      ) : null}

      {/*
        STUDY-5 -- affordance secundaria hacia EXACTAMENTE el mismo
        controlador que la X (`backToUnidades`, aprobado explícitamente por
        el Product Owner): mismo destino, sin confirmación nueva, sin
        cancelar respuestas ni progreso. Segunda affordance visual, no
        segundo comportamiento.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Salir de la pregunta"
        onPress={backToUnidades}
        style={styles.exitLink}
      >
        <Text variant="label" color="secondary">
          Salir de la pregunta
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * VC4 MICROBLOQUE 5B (§10/§14) -- "Recurso completado" + score se revelan
 * con un fade-in corto (~250ms) DESPUÉS de que el RewardBurst termina
 * (`visible`), nunca simultáneo -- así la secuencia comunica recompensa,
 * luego logro, luego rendimiento, sin competir. En reentrada (`visible`
 * ya `true` desde el montaje, ver `summaryRevealed`), se muestra de
 * inmediato sin animación (no hay nada que "revelar después de" un burst
 * que nunca ocurrió).
 */
function CompletionSummary({
  visible,
  correctCount,
  totalCount,
  percentage,
  tokens,
  styles,
  continueLabel,
  onContinue,
  onReview,
}: {
  visible: boolean;
  correctCount: number;
  totalCount: number;
  percentage: number;
  tokens: ThemeTokens;
  styles: ReturnType<typeof createStyles>;
  /** VC4 MICROBLOQUE 6.1.1 -- respeta el `origin` explícito ya aprobado en
   * 6.1: "Volver a Unidades" (origin 'unit') o "Volver a Recursos" (origin
   * 'resources'). Nunca `router.back()` incidental. */
  continueLabel: string;
  onContinue: () => void;
  /** VC4 MICROBLOQUE 6.1.2 -- "Repasar recurso" pertenece a Recursos, no a
   * Unidades (modelo de producto ya aprobado). `undefined` = el CTA NO se
   * renderiza (nunca un botón deshabilitado ni un espacio vacío) -- el
   * caller sólo lo pasa cuando `origin === 'resources'`. */
  onReview?: () => void;
}) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const wasVisible = useRef(visible);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    wasVisible.current = visible;
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.completedContent, { opacity }]}>
      <View style={styles.completedBadgeRing}>
        <View style={styles.completedBadge}>
          <Icon name="check" size={32} color={tokens.color.state.success.text} />
        </View>
      </View>
      <View style={styles.completedHeading}>
        <Text variant="heading2" accessibilityRole="header" style={styles.completedTitle}>
          Recurso completado
        </Text>
        <Text variant="bodySmall" color="secondary" style={styles.completedSubtitle}>
          Buen trabajo, sigue así
        </Text>
      </View>
      <Card variant="surface" style={styles.statsCard}>
        <View style={styles.statsColumn}>
          <Text variant="heading1" style={styles.statsValue}>
            {correctCount}/{totalCount}
          </Text>
          <Text variant="label" color="secondary" style={styles.statsLabel}>
            Correctas
          </Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsColumn}>
          <Text variant="heading1" style={styles.statsValue}>
            {percentage}%
          </Text>
          <Text variant="label" color="secondary" style={styles.statsLabel}>
            Aciertos
          </Text>
        </View>
      </Card>
      {/* VC4 MICROBLOQUE 6.1.2 -- "Repasar recurso" pertenece a Recursos, no
          a Unidades: `onReview` sólo existe cuando `origin === 'resources'`
          (ver caller). Ausente -> el botón NO se renderiza (nunca un hueco
          vacío ni un botón deshabilitado) -- composición limpia:
          stats -> CTA único "Volver a Unidades"/"Volver a Recursos". Sólo
          activa `reviewMode` local -- ninguna llamada de red, ninguna
          mutación (ver ReviewScreen). */}
      {onReview ? <Button variant="secondary" label="Repasar recurso" onPress={onReview} style={styles.completedButton} /> : null}
      <Button variant="primary" label={continueLabel} onPress={onContinue} style={styles.completedButton} />
    </Animated.View>
  );
}

/**
 * VC4 MICROBLOQUE 6 -- Repasar recurso, HARD READ-ONLY (§2/§7/§12 del
 * prompt). Consume EXCLUSIVAMENTE `questions`/`answers` ya cargados por
 * `load()` -- cero fetch propio, cero mutación posible desde este árbol:
 *
 *   - NO importa `submitResponseViaOutbox`/`answerExamQuestion` ni nada que
 *     llame a una API de escritura -- imposible de invocar porque no está
 *     ni siquiera referenciado aquí (defensa estructural, no sólo un guard).
 *   - NO llama `addOptimisticXp`/`armStudyProgressReconciliation` -- mismo
 *     motivo.
 *   - `AnswerOption` se usa SIEMPRE con `disabled` fijo en `true` y
 *     `onPress={() => {}}` -- RN's `Pressable` con `disabled=true` NUNCA
 *     invoca `onPress` a nivel nativo, así que aunque el callback existiera
 *     con lógica real no sería alcanzable por toque.
 *   - Navegación (`Anterior`/`Siguiente`/`Salir`) sólo toca el estado LOCAL
 *     `reviewIndex`/`onExit` (prop, cierra `reviewMode` en el padre) -- nunca
 *     `router`, nunca re-dispara `load()`.
 *
 * LIMITACIÓN CONOCIDA (aprobada explícitamente, ver decisión del bloque):
 * cuando `answer.isCorrect === false`, NINGUNA alternativa se marca como la
 * correcta -- el contrato de EDUCATION (`answerOptionPublicResponseSchema`)
 * NUNCA expone qué opción es correcta (ADR-0012, "la pauta no viaja al
 * cliente"), y este bloque tiene prohibido crear backend nuevo o inferir la
 * respuesta correcta por heurística. El usuario ve su propia respuesta,
 * si fue correcta/incorrecta, y la explicación ya existente -- nunca cuál
 * era la alternativa correcta cuando falló.
 */
function ReviewScreen({
  questions,
  answers,
  reviewIndex,
  setReviewIndex,
  onExit,
  insets,
  styles,
}: {
  questions: QuestionResponse[];
  answers: Record<string, AnsweredState>;
  reviewIndex: number;
  setReviewIndex: (updater: (index: number) => number) => void;
  onExit: () => void;
  insets: { top: number; bottom: number };
  styles: ReturnType<typeof createStyles>;
}) {
  const total = questions.length;
  const safeIndex = Math.min(Math.max(reviewIndex, 0), Math.max(total - 1, 0));
  const question = questions[safeIndex];
  const answer = answers[question.versionId];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Salir del repaso" onPress={onExit} color="secondary" />
        <Text variant="label" color="secondary" style={styles.progressLabel}>
          REPASO · Pregunta {safeIndex + 1} de {total}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <StemContent blocks={question.stemContent} />

        <View style={styles.options}>
          {question.answerOptions.map((option, optionIndex) => {
            const isChosen = answer?.answerOptionId === option.id;
            // §9/decisión aprobada -- SÓLO la alternativa elegida por el
            // estudiante puede llevar estado correct/incorrect; el resto
            // SIEMPRE queda en 'default', sin importar cuál sea la real.
            let optionState: AnswerOptionState = 'default';
            if (isChosen && answer) optionState = answer.isCorrect ? 'correct' : 'incorrect';
            return (
              <AnswerOption
                key={option.id}
                label={String.fromCharCode(65 + optionIndex)}
                state={optionState}
                disabled
                accessibilityRole="radio"
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}${isChosen ? ' -- tu respuesta' : ''}`}
                onPress={() => {}}
              >
                <ContentBlockRenderer blocks={[option.content]} formulaContext="option" />
              </AnswerOption>
            );
          })}
        </View>

        {answer ? (
          <View style={[styles.feedback, answer.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Text weight="bold" color={answer.isCorrect ? 'success' : 'error'}>
              {answer.isCorrect ? 'Respondiste correctamente' : 'Respondiste incorrectamente'}
            </Text>
            <ContentBlockRenderer blocks={question.explanationContent} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.navRow}>
          <Button
            variant="secondary"
            size="small"
            label="Anterior"
            disabled={safeIndex === 0}
            onPress={() => setReviewIndex((i) => Math.max(0, Math.min(i, total - 1) - 1))}
          />
          <Button
            variant="secondary"
            size="small"
            label="Siguiente"
            disabled={safeIndex === total - 1}
            onPress={() => setReviewIndex((i) => Math.min(total - 1, Math.max(i, 0) + 1))}
          />
        </View>
        <Button variant="tertiary" label="Salir del repaso" onPress={onExit} />
      </View>
    </View>
  );
}

/**
 * STUDY-5 -- el enunciado real de una pregunta es, hoy, un único bloque
 * `paragraph` (`stemContent: resourceContentBlocksSchema.parse([{type:
 * 'paragraph', ...}])`, ver `apps/backend/prisma/seed.ts`). Para darle la
 * jerarquía tipográfica grande que pide la referencia sin tocar
 * `ContentBlockRenderer` (compartido con Competir/Ejercicio, fuera de
 * alcance de STUDY-5), este caso -- el único real hoy -- se renderiza
 * directo con `variant="heading3"` sobre el mismo `text` real. Cualquier
 * forma distinta (heading/formula/imagen, o más de un bloque) NUNCA se
 * inventa aquí: cae en el `ContentBlockRenderer` genérico ya existente, sin
 * degradar ni perder contenido.
 */
function StemContent({ blocks }: { blocks: ResourceContentBlockResponse[] }) {
  if (blocks.length === 1 && blocks[0].type === 'paragraph') {
    return (
      <Text variant="heading3" accessibilityRole="header">
        {blocks[0].text}
      </Text>
    );
  }
  return <ContentBlockRenderer blocks={blocks} />;
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default, paddingHorizontal: 18 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2, marginBottom: spacing.space5 },
    progressTrack: { flex: 1, flexDirection: 'row' as const, gap: spacing.space1 },
    progressSegment: { flex: 1, height: 6, borderRadius: radii.small },
    progressSegmentDone: { backgroundColor: t.color.accent.default },
    progressSegmentPending: { backgroundColor: t.color.border.default },
    content: { gap: 14, paddingBottom: 24 },
    questionNumber: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    options: { gap: spacing.space3 },
    pendingNote: { fontStyle: 'italic' as const },
    feedback: { gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
    feedbackCorrect: { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border },
    feedbackIncorrect: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    tutorButton: { alignSelf: 'flex-start' as const, marginTop: 4 },
    completedScreen: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    // VC4 MICROBLOQUE 5C -- polish visual puro, misma estructura/orden de
    // antes (badge -> título -> stats -> CTA), sólo mejor jerarquía/espaciado.
    completedContent: { alignItems: 'center' as const, gap: spacing.space5, width: '100%' as const, maxWidth: 360 },
    completedBadgeRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: t.color.state.success.background,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    completedBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.color.state.success.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    completedHeading: { alignItems: 'center' as const, gap: spacing.space1 },
    completedTitle: { textAlign: 'center' as const },
    completedSubtitle: { textAlign: 'center' as const },
    statsCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-evenly' as const,
      alignSelf: 'stretch' as const,
      paddingVertical: spacing.space5,
    },
    statsColumn: { flex: 1, alignItems: 'center' as const, gap: 2 },
    statsDivider: { width: borders.default, height: 40, backgroundColor: t.color.border.default },
    statsValue: { color: t.color.accent.strong },
    statsLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    completedButton: { alignSelf: 'stretch' as const },
    continueButton: { marginTop: 8 },
    exitLink: { alignSelf: 'center' as const, paddingVertical: spacing.space2 },
    // VC4 MICROBLOQUE 6 -- estilos propios de ReviewScreen (Repasar recurso).
    // No reutilizan nombres de otras pantallas (p. ej. el intento de Ensayo)
    // -- mismo criterio de espaciado (`spacing`), tokens ya usados arriba.
    progressLabel: { flex: 1, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    scroll: { flex: 1 },
    footer: { gap: spacing.space2, paddingTop: spacing.space2 },
    navRow: { flexDirection: 'row' as const, gap: spacing.space2 },
  };
}
