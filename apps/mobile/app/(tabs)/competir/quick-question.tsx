import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { AnswerOptionPublicResponse, ResourceContentBlockResponse } from '@axioma/contracts';
import { openQuickQuestionSession, nextQuickQuestion, answerQuickQuestion, closeQuickQuestionSession } from '../../../lib/api/quick-question';
import { mapNextResult, mapAnswerResult, resolveAnswerOperationId, type QuestionPresented, type PendingAnswerAttempt } from '../../../lib/quick-question/outcomes';
import {
  QUICK_QUESTION_TIME_LIMIT_SECONDS,
  answerHeadline,
  optionOutcome,
  secondsRemainingUntil,
  type AnswerVerdict,
  type OptionOutcome,
} from '../../../lib/quick-question/quick-question-feedback';
import { ContentBlockRenderer } from '../../../components/content-block-renderer';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Button, AnswerOption, Icon } from '../../../components/ui';
import { QuickQuestionTimer } from '../../../components/competitive/quick-question-timer';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

const TIMER_TICK_MS = 250;

type Screen =
  | { status: 'initializing' }
  | { status: 'error'; message: string }
  | { status: 'session_closed' }
  | { status: 'no_questions'; sessionId: string }
  | {
      status: 'question';
      sessionId: string;
      question: QuestionPresented;
      /** Epoch ms en que el temporizador VISUAL llega a 0. Solo UI (Incremento 8). */
      deadlineTs: number;
      selectedOptionId: string | null;
      /** El temporizador se congela en la PRIMERA selección y ya no reanuda (§3). */
      frozen: boolean;
      /** Segundos que quedaban al congelar -- para mostrarlos estáticos en el pill. */
      frozenSeconds: number;
      submitting: boolean;
      pendingAttempt: PendingAnswerAttempt | null;
      submitError: string | null;
    }
  | {
      status: 'result';
      sessionId: string;
      question: QuestionPresented;
      verdict: AnswerVerdict;
      /** Solo tras `POST /answer`. `null` en un timeout LOCAL -> no se revela la correcta (Incremento 9 lo hará). */
      correctAnswerOptionId: string | null;
      selectedOptionId: string | null;
      explanationContent: ResourceContentBlockResponse[] | null;
      loadingNext: boolean;
      nextError: string | null;
    };

/**
 * Pregunta rápida -- Bloque IV, Incremento 5, sub-incremento 5.d + rediseño
 * visual Competir V1, Incremento 8 (temporizador visual + feedback).
 * ONLINE-ONLY: un fallo de red es un error inmediato con reintento manual.
 *
 * Reanudación: al montar, `openSession` -> `next` puede devolver la
 * pregunta pendiente de una sesión YA existente -- se renderiza igual que
 * una recién seleccionada.
 *
 * `close()` SOLO se invoca desde el `onPress` del botón de salida -- NUNCA
 * desde un efecto de desmontaje ni un handler de back. `mountedRef` evita
 * `setState` tras desmontar.
 *
 * TEMPORIZADOR (Incremento 8) -- 45 s, SOLO VISUAL/local: arranca únicamente
 * cuando la pregunta ya está cargada y visible; se congela en la primera
 * selección; al llegar a 0 sin selección hace un timeout LOCAL (no consume
 * la pregunta en el servidor, no afirma consecuencia de LP). El Incremento
 * 9 lo reemplazará por un `deadline` autoritativo del backend.
 */
export default function QuickQuestionScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [screen, setScreen] = useState<Screen>({ status: 'initializing' });
  const [nowTs, setNowTs] = useState(() => Date.now());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const init = useCallback(async () => {
    setScreen({ status: 'initializing' });
    const sessionResult = await openQuickQuestionSession();
    if (!mountedRef.current) return;
    if (!sessionResult.ok) {
      setScreen({ status: 'error', message: sessionResult.message });
      return;
    }
    await loadNext(sessionResult.data.sessionId);
  }, []);

  const loadNext = useCallback(async (sessionId: string) => {
    const result = await nextQuickQuestion(sessionId);
    if (!mountedRef.current) return;
    const outcome = mapNextResult(result);
    applyNextOutcome(sessionId, outcome);
  }, []);

  function applyNextOutcome(sessionId: string, outcome: ReturnType<typeof mapNextResult>) {
    if (outcome.kind === 'question_presented') {
      // El temporizador arranca AQUÍ -- la pregunta ya está cargada y visible.
      setScreen({
        status: 'question',
        sessionId,
        question: outcome.question,
        deadlineTs: Date.now() + QUICK_QUESTION_TIME_LIMIT_SECONDS * 1000,
        selectedOptionId: null,
        frozen: false,
        frozenSeconds: QUICK_QUESTION_TIME_LIMIT_SECONDS,
        submitting: false,
        pendingAttempt: null,
        submitError: null,
      });
      setNowTs(Date.now());
      return;
    }
    if (outcome.kind === 'no_questions') {
      setScreen({ status: 'no_questions', sessionId });
      return;
    }
    if (outcome.kind === 'session_closed') {
      // Estado TERMINAL -- nunca se abre otra sesión automáticamente.
      setScreen({ status: 'session_closed' });
      return;
    }
    setScreen({ status: 'error', message: outcome.message });
  }

  useEffect(() => {
    init();
  }, [init]);

  // Timeout LOCAL: solo aplica si seguimos en la pregunta, sin enviar y sin
  // selección (una selección congela el temporizador -> nunca llega aquí).
  const handleLocalTimeout = useCallback(() => {
    if (!mountedRef.current) return;
    setScreen((prev) => {
      if (prev.status !== 'question' || prev.submitting || prev.selectedOptionId !== null) return prev;
      return {
        status: 'result',
        sessionId: prev.sessionId,
        question: prev.question,
        verdict: 'timeout',
        correctAnswerOptionId: null,
        selectedOptionId: null,
        explanationContent: null,
        loadingNext: false,
        nextError: null,
      };
    });
  }, []);

  // Un ÚNICO intervalo mientras el temporizador corre. Se limpia al
  // desmontar, al congelar, al enviar y al cambiar de pregunta.
  const timerRunning = screen.status === 'question' && !screen.frozen && !screen.submitting;
  const deadlineTs = screen.status === 'question' ? screen.deadlineTs : 0;
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      if (Date.now() >= deadlineTs) {
        clearInterval(id);
        handleLocalTimeout();
        return;
      }
      setNowTs(Date.now());
    }, TIMER_TICK_MS);
    return () => clearInterval(id);
  }, [timerRunning, deadlineTs, handleLocalTimeout]);

  function handleSelectOption(optionId: string) {
    setScreen((prev) => {
      if (prev.status !== 'question' || prev.submitting) return prev;
      // La primera selección congela el temporizador; las siguientes no
      // vuelven a moverlo.
      const frozenSeconds = prev.frozen ? prev.frozenSeconds : Math.ceil(secondsRemainingUntil(prev.deadlineTs, Date.now()));
      return { ...prev, selectedOptionId: optionId, frozen: true, frozenSeconds, submitError: null };
    });
  }

  async function handleSubmit() {
    if (screen.status !== 'question' || screen.selectedOptionId === null || screen.submitting) return;
    const { sessionId, selectedOptionId, question } = screen;
    const operationId = resolveAnswerOperationId(screen.pendingAttempt, selectedOptionId, randomUUID);

    setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: true, pendingAttempt: { answerOptionId: selectedOptionId, operationId }, submitError: null } : prev));

    const result = await answerQuickQuestion(sessionId, selectedOptionId, operationId);
    if (!mountedRef.current) return;
    const outcome = mapAnswerResult(result);

    if (outcome.kind === 'ok') {
      setScreen({
        status: 'result',
        sessionId,
        question,
        verdict: outcome.data.isCorrect ? 'correct' : 'incorrect',
        correctAnswerOptionId: outcome.data.correctAnswerOptionId,
        selectedOptionId,
        explanationContent: outcome.data.explanationContent,
        loadingNext: false,
        nextError: null,
      });
      return;
    }

    if (outcome.kind === 'network') {
      // AMBIGUO -- conserva pendingAttempt (mismo operationId en el próximo
      // intento). El temporizador NO se reanuda: la selección ya lo congeló
      // (§3) -- reintentar el envío no devuelve tiempo. Decisión
      // conservadora, documentada.
      setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: false, submitError: outcome.message } : prev));
      return;
    }

    if (outcome.kind === 'conflict') {
      // 409 DEFINITIVO -- reconciliar con /next, nunca reintentar con el mismo operationId.
      await loadNext(sessionId);
      return;
    }

    // invalid_option / error -- definitivo; descarta el intento, permite
    // elegir de nuevo. El temporizador sigue congelado (la selección lo
    // congeló); no se reanuda.
    setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: false, pendingAttempt: null, submitError: outcome.message } : prev));
  }

  async function handleNextQuestion() {
    if (screen.status !== 'result' || screen.loadingNext) return;
    const { sessionId } = screen;
    setScreen((prev) => (prev.status === 'result' ? { ...prev, loadingNext: true, nextError: null } : prev));
    const result = await nextQuickQuestion(sessionId);
    if (!mountedRef.current) return;
    const outcome = mapNextResult(result);
    if (outcome.kind === 'network' || outcome.kind === 'error') {
      setScreen((prev) => (prev.status === 'result' ? { ...prev, loadingNext: false, nextError: outcome.message } : prev));
      return;
    }
    applyNextOutcome(sessionId, outcome);
  }

  /** ÚNICO lugar del archivo que invoca `closeQuickQuestionSession` -- exclusivamente desde este `onPress`. */
  async function handleExit() {
    const sessionId = 'sessionId' in screen ? screen.sessionId : null;
    if (sessionId) {
      await closeQuickQuestionSession(sessionId);
    }
    if (!mountedRef.current) return;
    router.push('/(tabs)/competir');
  }

  if (screen.status === 'initializing') return <LoadingState message="Preparando pregunta rápida…" />;
  if (screen.status === 'error') return <ErrorState message={screen.message} onRetry={init} />;

  if (screen.status === 'session_closed') {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary" style={styles.infoMessage}>
          Esta sesión ya se cerró.
        </Text>
        <Button variant="primary" label="Volver a Competir" onPress={() => router.push('/(tabs)/competir')} style={styles.primaryButton} />
      </View>
    );
  }

  if (screen.status === 'no_questions') {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary" style={styles.infoMessage}>
          No hay preguntas disponibles ahora.
        </Text>
        <Button variant="primary" label="Salir" onPress={handleExit} style={styles.primaryButton} />
      </View>
    );
  }

  if (screen.status === 'question') {
    const secondsRemaining = screen.frozen ? screen.frozenSeconds : secondsRemainingUntil(screen.deadlineTs, nowTs);
    return (
      <View style={styles.screen}>
        <View style={styles.timerBar}>
          <QuickQuestionTimer secondsRemaining={secondsRemaining} frozen={screen.frozen || screen.submitting} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <ContentBlockRenderer blocks={screen.question.stemContent} />
          <View style={styles.options}>
            {screen.question.answerOptions.map((option) => (
              <AnswerOptionRow
                key={option.id}
                option={option}
                state={screen.selectedOptionId === option.id ? 'selected' : 'default'}
                disabled={screen.submitting}
                onSelect={() => handleSelectOption(option.id)}
                styles={styles}
                tokens={tokens}
              />
            ))}
          </View>
          {screen.submitError ? (
            <Text variant="bodySmall" color="error">
              {screen.submitError}
            </Text>
          ) : null}
          <Button
            variant="primary"
            label="Responder"
            accessibilityLabel="Responder"
            onPress={handleSubmit}
            disabled={screen.selectedOptionId === null || screen.submitting}
            loading={screen.submitting}
            style={styles.primaryButton}
          />
          <Button variant="tertiary" label="Salir" accessibilityLabel="Salir" onPress={handleExit} style={styles.exitButton} />
        </ScrollView>
      </View>
    );
  }

  // screen.status === 'result' -- respuesta enviada o timeout LOCAL.
  const headlineColor = screen.verdict === 'correct' ? 'success' : screen.verdict === 'incorrect' ? 'error' : 'secondary';
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="heading2" weight="bold" color={headlineColor}>
        {answerHeadline(screen.verdict)}
      </Text>

      {screen.verdict === 'timeout' ? (
        <Text variant="bodySmall" color="secondary">
          No respondiste a tiempo. La pregunta sigue disponible desde "Siguiente pregunta".
        </Text>
      ) : null}

      <ContentBlockRenderer blocks={screen.question.stemContent} />

      <View style={styles.options}>
        {screen.question.answerOptions.map((option) => (
          <AnswerOptionRow
            key={option.id}
            option={option}
            state={resultOptionState(optionOutcome(option.id, screen.correctAnswerOptionId, screen.selectedOptionId))}
            outcome={optionOutcome(option.id, screen.correctAnswerOptionId, screen.selectedOptionId)}
            disabled
            onSelect={() => undefined}
            styles={styles}
            tokens={tokens}
          />
        ))}
      </View>

      {screen.explanationContent ? <ContentBlockRenderer blocks={screen.explanationContent} /> : null}

      {screen.nextError ? (
        <Text variant="bodySmall" color="error">
          {screen.nextError}
        </Text>
      ) : null}

      <Button
        variant="primary"
        label="Siguiente pregunta"
        accessibilityLabel="Siguiente pregunta"
        onPress={handleNextQuestion}
        disabled={screen.loadingNext}
        loading={screen.loadingNext}
        style={styles.primaryButton}
      />
      <Button variant="tertiary" label="Volver a Competir" accessibilityLabel="Volver a Competir" onPress={handleExit} style={styles.exitButton} />
    </ScrollView>
  );
}

/** Mapea el resultado por alternativa al `state` visual de `<AnswerOption>` -- `muted` en un resultado -> `disabled` (bloqueada, neutra). */
function resultOptionState(outcome: OptionOutcome): 'correct' | 'incorrect' | 'disabled' {
  if (outcome === 'correct') return 'correct';
  if (outcome === 'incorrect') return 'incorrect';
  return 'disabled';
}

function AnswerOptionRow({
  option,
  state,
  outcome,
  disabled,
  onSelect,
  tokens,
}: {
  option: AnswerOptionPublicResponse;
  state: 'default' | 'selected' | 'correct' | 'incorrect' | 'disabled';
  /** Presente sólo en la pantalla de resultado -- añade check / X (no depende solo del color, §8). */
  outcome?: OptionOutcome;
  disabled: boolean;
  onSelect: () => void;
  styles: ReturnType<typeof createStyles>;
  tokens: ThemeTokens;
}) {
  const adornment: ReactNode =
    outcome === 'correct' ? (
      <Icon name="check" size={18} color={tokens.color.state.success.text} />
    ) : outcome === 'incorrect' ? (
      <Icon name="x-circle" size={18} color={tokens.color.state.error.text} />
    ) : null;

  return (
    <AnswerOption
      state={state}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={option.content.type === 'paragraph' ? option.content.text : 'Alternativa'}
      onPress={onSelect}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ContentBlockRenderer blocks={[option.content]} />
        </View>
        {adornment}
      </View>
    </AnswerOption>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default },
    timerBar: { paddingHorizontal: 16, paddingTop: 12 },
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: 16, gap: 16 },
    centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, padding: 24, backgroundColor: t.color.background.default },
    infoMessage: { textAlign: 'center' as const },
    options: { gap: 10 },
    primaryButton: { marginTop: 4 },
    exitButton: { alignSelf: 'center' as const },
  };
}
