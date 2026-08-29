import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttemptQuestion, ExamAttemptStateResponse } from '@axioma/contracts';
import {
  getExamAttempt,
  getExamAttemptQuestions,
  answerExamQuestion,
  submitExamAttempt,
} from '../../../../../../lib/api/exams';
import { forgetActiveAttempt } from '../../../../../../lib/exams/attempt-cache';
import {
  selectionsFromQuestions,
  sortByDisplayOrder,
  reindexCurrentQuestion,
  withSelection,
  countProgress,
  liveOptionState,
  navCellState,
  type SelectionMap,
} from '../../../../../../lib/exams/attempt-state';
import { LoadingState } from '../../../../../../components/loading-state';
import { ErrorState } from '../../../../../../components/error-state';
import { ContentBlockRenderer } from '../../../../../../components/content-block-renderer';
import { ExamCountdown } from '../../../../../../components/exams/exam-countdown';
import { ExamQuestionNavigator, type NavigatorCellState } from '../../../../../../components/exams/exam-question-navigator';
import { IconButton, Text, Button, AnswerOption, Dialog } from '../../../../../../components/ui';
import type { AnswerOptionState } from '../../../../../../components/ui';
import { useThemedStyles, spacing, radii } from '../../../../../../theme';
import type { ThemeTokens } from '../../../../../../theme';

/** `timing` = calibración del countdown; `serverTime` fresco tras cada refetch. */
type TimingRef = { expiresAt: string; serverTime: string };

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      questions: ExamAttemptQuestion[];
      selections: SelectionMap;
      timing: TimingRef;
    };

function newOperationId(): string {
  // UUID v4 -- suficiente para clave de idempotencia de transporte (no criptográfico).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Pantalla de intento de Ensayo -- ENSAYOS-M1-C. Núcleo del flujo.
 *
 * El backend es la única autoridad (ADR-0024): status, selecciones y reloj
 * vienen de él. Esta pantalla NUNCA: revela corrección/explicación mientras
 * está ACTIVE, asume EXPIRED localmente, ni reinicia el reloj al reabrir.
 * ONLINE-ONLY: sin cola offline; si falla la red al guardar, se muestra el
 * error y se puede reintentar en vivo.
 */
export default function EnsayoAttemptScreen() {
  const { examId, attemptId, name } = useLocalSearchParams<{ examId: string; attemptId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(true);
  /**
   * `questionVersionId` de la pregunta que el usuario está viendo AHORA --
   * ENSAYOS-M1-D2. Es una copia derivada (se refresca en cada render), nunca
   * una segunda fuente de verdad: `currentIndex` sigue siendo la única
   * selección mutable. Solo sirve para reanclar por identidad tras un refetch
   * (ver `reindexCurrentQuestion`) sin meter `currentIndex` en las deps de
   * `load` (lo que recrearía el efecto en cada navegación).
   */
  const currentQuestionIdRef = useRef<string | null>(null);
  /** Params más recientes para el redirect terminal -- mantiene `goToResult`/`load` estables (deps solo `attemptId`). */
  const redirectParamsRef = useRef({ examId, name });
  redirectParamsRef.current = { examId, name };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const goToResult = useCallback(() => {
    const { examId: exId, name: nm } = redirectParamsRef.current;
    router.replace({
      pathname: '/(tabs)/estudio/ensayos/[examId]/result/[attemptId]',
      params: { examId: exId, attemptId, name: nm ?? '' },
    });
  }, [router, attemptId]);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const qResult = await getExamAttemptQuestions(attemptId);
    if (!mounted.current) return;
    if (qResult.ok) {
      // Orden explícito y estable por displayOrder (el índice de arreglo ES la
      // identidad de "pregunta N"). Tras un refetch, reanclar al usuario en la
      // MISMA pregunta por identidad -- no moverlo porque cambiaron las refs.
      const questions = sortByDisplayOrder(qResult.data.questions);
      setCurrentIndex(reindexCurrentQuestion(questions, currentQuestionIdRef.current));
      setState({
        status: 'ready',
        questions,
        selections: selectionsFromQuestions(questions),
        timing: { expiresAt: qResult.data.expiresAt, serverTime: qResult.data.serverTime },
      });
      return;
    }
    // 409 = el intento ya no está ACTIVE -> el backend decide, vamos al resultado.
    if (qResult.kind === 'http' && qResult.status === 409) {
      goToResult();
      return;
    }
    setState({ status: 'error', message: qResult.message });
  }, [attemptId, goToResult]);

  useEffect(() => {
    load();
  }, [load]);

  /** Refetch del estado del intento -- lo dispara el countdown al llegar a 0 y `AppState -> active`. El backend decide ACTIVE vs EXPIRED. */
  const refreshAttemptState = useCallback(async () => {
    const result = await getExamAttempt(attemptId);
    if (!mounted.current || result.ok === false) return;
    const attempt: ExamAttemptStateResponse = result.data;
    if (attempt.status !== 'ACTIVE') {
      goToResult();
      return;
    }
    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      return { ...prev, timing: { expiresAt: attempt.expiresAt, serverTime: attempt.serverTime } };
    });
  }, [attemptId, goToResult]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshAttemptState();
    });
    return () => subscription.remove();
  }, [refreshAttemptState]);

  async function handleSelect(question: ExamAttemptQuestion, answerOptionId: string) {
    if (state.status !== 'ready' || pendingOptionId !== null) return;
    if (state.selections[question.questionVersionId] === answerOptionId) return; // ya es la selección vigente
    setAnswerError(null);
    setPendingOptionId(answerOptionId);

    const result = await answerExamQuestion(attemptId, {
      questionVersionId: question.questionVersionId,
      answerOptionId,
      operationId: newOperationId(),
    });

    if (!mounted.current) return;
    setPendingOptionId(null);

    if (result.ok) {
      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, selections: withSelection(prev.selections, question.questionVersionId, result.data.selectedAnswerOptionId) }
          : prev,
      );
      return;
    }
    // 409 = intento cerrado/expirado mientras respondía -> el backend manda.
    if (result.kind === 'http' && result.status === 409) {
      void refreshAttemptState();
      return;
    }
    setAnswerError(
      result.kind === 'network'
        ? 'No se pudo guardar la respuesta. Revisa tu conexión e inténtalo de nuevo.'
        : result.message,
    );
  }

  async function handleSubmit() {
    if (state.status !== 'ready' || submitting) return;
    setSubmitting(true);
    const result = await submitExamAttempt(attemptId);
    if (!mounted.current) return;
    setSubmitting(false);
    setConfirmSubmit(false);
    if (result.ok || (result.kind === 'http' && result.status === 409)) {
      await forgetActiveAttempt(examId);
      goToResult();
      return;
    }
    setAnswerError(result.message);
  }

  if (state.status === 'loading') return <LoadingState message="Cargando ensayo…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.questions.length === 0) {
    return <ErrorState message="Este ensayo no tiene preguntas disponibles." onRetry={load} />;
  }

  const total = state.questions.length;
  const safeIndex = Math.min(Math.max(currentIndex, 0), total - 1);
  const question = state.questions[safeIndex];
  // Fuente única: TODO lo de "la pregunta actual" (header, stem, alternativas,
  // selección, celda del navegador, Prev/Next) se deriva de este mismo objeto.
  const currentQuestion = question;
  currentQuestionIdRef.current = currentQuestion.questionVersionId;
  const selectedOptionId = state.selections[currentQuestion.questionVersionId];
  const { answered, unanswered } = countProgress(state.questions, state.selections);

  const navigatorStates: NavigatorCellState[] = state.questions.map((q, index) =>
    navCellState({ isCurrent: index === safeIndex, isAnswered: !!state.selections[q.questionVersionId] }),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Salir del ensayo" onPress={() => router.back()} color="secondary" />
        <Text variant="label" color="secondary" style={styles.progressLabel}>
          Pregunta {currentQuestion.displayOrder} de {total}
        </Text>
        <ExamCountdown expiresAt={state.timing.expiresAt} serverTime={state.timing.serverTime} onExpire={refreshAttemptState} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={navigatorOpen ? 'Ocultar el listado de preguntas' : 'Ver el listado de preguntas'}
        onPress={() => setNavigatorOpen((open) => !open)}
        style={styles.navToggle}
      >
        <Text variant="bodySmall" color="secondary">
          {navigatorOpen ? 'Ocultar preguntas' : `Ver preguntas · ${answered}/${total} respondidas`}
        </Text>
      </Pressable>
      {navigatorOpen ? (
        <View style={styles.navigatorWrap}>
          <ExamQuestionNavigator
            count={total}
            states={navigatorStates}
            onSelect={(index) => {
              setCurrentIndex(index);
              setNavigatorOpen(false);
            }}
          />
        </View>
      ) : null}

      {/* `key` por identidad de pregunta -- ENSAYOS-M1-D2: al cambiar de
          pregunta React desmonta y remonta este subárbol en vez de reconciliar
          en sitio, así ningún estado interno (tamaño de fórmula, parseo de SVG,
          posición de scroll) del enunciado anterior sobrevive al cambio de
          índice. Elimina la clase de bug "header en Q65 / contenido en Q61". */}
      <ScrollView key={currentQuestion.questionVersionId} style={styles.scroll} contentContainerStyle={styles.content}>
        <ContentBlockRenderer blocks={currentQuestion.stemContent} />
        <Text variant="bodySmall" color="secondary">
          Selecciona una alternativa. Puedes cambiarla mientras el ensayo siga abierto.
        </Text>

        {answerError ? (
          <Text variant="bodySmall" color="error">
            {answerError}
          </Text>
        ) : null}

        <View style={styles.options}>
          {currentQuestion.answerOptions.map((option, optionIndex) => {
            const live = liveOptionState({ optionId: option.id, selectedOptionId, pendingOptionId });
            const optionState: AnswerOptionState = live === 'submitting' ? 'submitting' : live === 'selected' ? 'selected' : 'default';
            return (
              <AnswerOption
                key={option.id}
                label={String.fromCharCode(65 + optionIndex)}
                state={optionState}
                disabled={pendingOptionId !== null}
                accessibilityRole="radio"
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                onPress={() => handleSelect(currentQuestion, option.id)}
              >
                <ContentBlockRenderer blocks={[option.content]} formulaContext="option" />
              </AnswerOption>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.navRow}>
          <Button
            variant="secondary"
            size="small"
            label="Anterior"
            disabled={safeIndex === 0}
            onPress={() => setCurrentIndex((i) => Math.max(0, Math.min(i, total - 1) - 1))}
          />
          <Button
            variant="secondary"
            size="small"
            label="Siguiente"
            disabled={safeIndex === total - 1}
            onPress={() => setCurrentIndex((i) => Math.min(total - 1, Math.max(i, 0) + 1))}
          />
        </View>
        <Button
          variant="primary"
          label="Entregar ensayo"
          onPress={() => setConfirmSubmit(true)}
          accessibilityLabel="Entregar ensayo"
        />
      </View>

      <Dialog
        visible={confirmSubmit}
        title="¿Quieres entregar el ensayo?"
        message={
          unanswered > 0
            ? `Has respondido ${answered} de ${total} preguntas. Las ${unanswered} sin responder contarán como incorrectas.`
            : `Has respondido las ${total} preguntas.`
        }
        primaryAction={{ label: 'Entregar', onPress: handleSubmit, variant: 'primary' }}
        secondaryAction={{ label: 'Seguir revisando', onPress: () => setConfirmSubmit(false), variant: 'secondary' }}
        onRequestClose={() => setConfirmSubmit(false)}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, paddingHorizontal: 16, backgroundColor: t.color.background.default },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.space2,
      marginBottom: spacing.space2,
    },
    progressLabel: { flex: 1, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    navToggle: {
      alignSelf: 'flex-start' as const,
      paddingVertical: spacing.space1,
    },
    navigatorWrap: {
      paddingVertical: spacing.space2,
      paddingHorizontal: spacing.space1,
      borderRadius: radii.medium,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      marginBottom: spacing.space2,
    },
    // ENSAYOS-M1-D -- el ScrollView necesita `flex: 1` para quedar acotado
    // entre el header y el footer (hermanos de altura fija en la columna
    // `screen`). Sin esto tomaba su altura natural y, con preguntas largas
    // (fórmulas incluidas), las últimas alternativas y/o el footer quedaban
    // fuera de pantalla sin poder desplazarse -> no se podían responder Q64
    // y Q65 y el conteo se quedaba en 63. `paddingBottom` deja aire bajo la
    // última alternativa para que se despegue del footer al hacer scroll.
    scroll: { flex: 1 },
    content: { gap: 14, paddingBottom: 32 },
    options: { gap: spacing.space3 },
    footer: { gap: spacing.space2, paddingTop: spacing.space2 },
    navRow: { flexDirection: 'row' as const, gap: spacing.space2 },
  };
}
