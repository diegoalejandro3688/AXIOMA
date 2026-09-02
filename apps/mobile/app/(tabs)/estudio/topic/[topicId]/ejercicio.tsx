import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestionResponse, ResourceContentBlockResponse, TopicProgressResponse } from '@axioma/contracts';
import { listPublishedQuestions } from '../../../../../lib/api/education';
import { getTopicProgress } from '../../../../../lib/api/progress';
import { submitResponseViaOutbox } from '../../../../../lib/progress/submit-response';
import { syncPendingOperations } from '../../../../../lib/offline/sync-worker';
import { isPremiumRequiredError, isPremiumRequiredOutcome } from '../../../../../lib/entitlement/premium-error';
import { PremiumLockedScreen } from '../../../../../components/premium/premium-locked-screen';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../../components/content-block-renderer';
import { IconButton, Text, Button, AnswerOption, Icon } from '../../../../../components/ui';
import type { AnswerOptionState } from '../../../../../components/ui';
import { useTheme, useThemedStyles, spacing, radii } from '../../../../../theme';
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
  const { topicId, subjectId, name, unitId, unitName } = useLocalSearchParams<{
    topicId: string;
    subjectId: string;
    name?: string;
    unitId?: string;
    unitName?: string;
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
    setDisplayedQuestionVersionId(firstUnanswered?.versionId ?? null);
    setShowCompleted(!firstUnanswered);

    setState({ status: 'ready', questions: questionsResult.data, topicStatus: progressResult.data.status, answers });
  }, [topicId]);

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

  if (state.status === 'loading') return <LoadingState message="Cargando preguntas…" />;
  if (state.status === 'premium') return <PremiumLockedScreen origin="unit" onBack={backToUnidades} />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.questions.length === 0) {
    return <EmptyState message="Todavía no hay preguntas publicadas para esta unidad." actionLabel="Volver a la unidad" onAction={backToUnidades} />;
  }

  if (showCompleted) {
    return (
      <View style={[styles.completedScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.completedBadge}>
          <Icon name="check" size={28} color={tokens.color.state.success.text} />
        </View>
        <Text variant="heading2" accessibilityRole="header">
          Unidad completada
        </Text>
        <Text variant="body" color="secondary" style={styles.completedMessage}>
          Respondiste todas las preguntas de esta unidad.
        </Text>
        <Button variant="primary" label="Volver a Unidades" onPress={backToUnidades} style={styles.completedButton} />
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
      gap: 14,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    completedBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.color.state.success.background,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    completedMessage: { textAlign: 'center' as const },
    completedButton: { marginTop: 8, alignSelf: 'stretch' as const },
    continueButton: { marginTop: 8 },
    exitLink: { alignSelf: 'center' as const, paddingVertical: spacing.space2 },
  };
}
