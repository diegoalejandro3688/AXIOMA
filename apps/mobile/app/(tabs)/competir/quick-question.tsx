import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { AnswerOptionPublicResponse, ResourceContentBlockResponse } from '@axioma/contracts';
import {
  openQuickQuestionSession,
  nextQuickQuestion,
  answerQuickQuestion,
  timeoutQuickQuestion,
  closeQuickQuestionSession,
} from '../../../lib/api/quick-question';
import {
  mapNextResult,
  mapAnswerResult,
  mapTimeoutResult,
  resolveAnswerOperationId,
  type QuestionPresented,
  type PendingAnswerAttempt,
} from '../../../lib/quick-question/outcomes';
import {
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
      /** Epoch ms de la deadline AUTORITATIVA del servidor (`deadlineAt` de `/next`). */
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
      /** El temporizador visual llegó a 0 -- se está pidiendo la confirmación AUTORITATIVA a `/timeout`. */
      status: 'resolving_timeout';
      sessionId: string;
      question: QuestionPresented;
      error: string | null;
    }
  | {
      status: 'result';
      sessionId: string;
      question: QuestionPresented;
      verdict: AnswerVerdict;
      /**
       * id de la alternativa correcta. Presente tras `ANSWERED`, tras un
       * `TIMED_OUT` CONFIRMADO por el servidor (respuesta tardía o
       * `/timeout`). `null` sólo en el caso raro `NO_PENDING_QUESTION` (la
       * pregunta ya no está y no hay clave que revelar).
       */
      correctAnswerOptionId: string | null;
      selectedOptionId: string | null;
      explanationContent: ResourceContentBlockResponse[] | null;
      loadingNext: boolean;
      nextError: string | null;
    };

/**
 * Pregunta rápida -- Bloque IV, Incremento 5, sub-incremento 5.d + rediseño
 * visual Competir V1, Incrementos 8-9.
 *
 * TEMPORIZADOR -- 45 s con AUTORIDAD DE SERVIDOR (Incremento 9). La deadline
 * llega en `deadlineAt` de `/next` (`currentPresentedAt + 45 s`, reloj del
 * servidor); el temporizador visual se DERIVA de ahí, así volver de segundo
 * plano NO lo reinicia. Al llegar a 0 el móvil pide a `/timeout` la
 * resolución autoritativa -- nunca decide el timeout por su cuenta. El
 * servidor: `TIMED_OUT` (pregunta consumida, sin recompensa de LP, revela la correcta),
 * `NOT_EXPIRED` (re-sincroniza con `deadlineAt`) o `NO_PENDING_QUESTION`.
 * Una respuesta que llega tarde también se resuelve como `TIMED_OUT` en el
 * servidor.
 *
 * `close()` SOLO se invoca desde el `onPress` del botón de salida.
 * `mountedRef` evita `setState` tras desmontar.
 */
export default function QuickQuestionScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [screen, setScreen] = useState<Screen>({ status: 'initializing' });
  const [nowTs, setNowTs] = useState(() => Date.now());
  const mountedRef = useRef(true);
  const timeoutInFlightRef = useRef(false);

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
      // El temporizador arranca AQUÍ y se deriva de la deadline autoritativa.
      setScreen({
        status: 'question',
        sessionId,
        question: outcome.question,
        deadlineTs: Date.parse(outcome.question.deadlineAt),
        selectedOptionId: null,
        frozen: false,
        frozenSeconds: 0,
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
      setScreen({ status: 'session_closed' });
      return;
    }
    setScreen({ status: 'error', message: outcome.message });
  }

  useEffect(() => {
    init();
  }, [init]);

  /**
   * El temporizador visual llegó a 0: se pide a `/timeout` la resolución
   * AUTORITATIVA. El móvil NUNCA decide el timeout por su cuenta.
   */
  const resolveTimeout = useCallback(async (sessionId: string, question: QuestionPresented) => {
    if (timeoutInFlightRef.current) return;
    timeoutInFlightRef.current = true;
    setScreen((prev) => (prev.status === 'question' ? { status: 'resolving_timeout', sessionId, question, error: null } : prev));

    const outcome = mapTimeoutResult(await timeoutQuickQuestion(sessionId));
    timeoutInFlightRef.current = false;
    if (!mountedRef.current) return;

    setScreen((prev) => {
      if (prev.status !== 'resolving_timeout') return prev;
      if (outcome.kind === 'timed_out' || outcome.kind === 'no_pending') {
        return {
          status: 'result',
          sessionId,
          question,
          verdict: 'timeout',
          correctAnswerOptionId: outcome.kind === 'timed_out' ? outcome.correctAnswerOptionId : null,
          selectedOptionId: null,
          explanationContent: null,
          loadingNext: false,
          nextError: null,
        };
      }
      if (outcome.kind === 'not_expired') {
        // El reloj local iba adelantado: se re-sincroniza con la deadline
        // autoritativa y la pregunta sigue activa.
        return {
          status: 'question',
          sessionId,
          question,
          deadlineTs: Date.parse(outcome.deadlineAt),
          selectedOptionId: null,
          frozen: false,
          frozenSeconds: 0,
          submitting: false,
          pendingAttempt: null,
          submitError: null,
        };
      }
      if (outcome.kind === 'session_closed') return { status: 'session_closed' };
      // network / error -- se mantiene el estado de resolución con un
      // reintento explícito; las alternativas NO se re-habilitan.
      return { status: 'resolving_timeout', sessionId, question, error: outcome.message };
    });
  }, []);

  // Un ÚNICO intervalo mientras el temporizador corre. Se limpia al
  // desmontar, al congelar, al enviar y al cambiar de pregunta.
  const timerRunning = screen.status === 'question' && !screen.frozen && !screen.submitting;
  const deadlineTs = screen.status === 'question' ? screen.deadlineTs : 0;
  const activeSessionId = screen.status === 'question' ? screen.sessionId : null;
  const activeQuestion = screen.status === 'question' ? screen.question : null;
  useEffect(() => {
    if (!timerRunning || activeSessionId === null || activeQuestion === null) return;
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      if (Date.now() >= deadlineTs) {
        clearInterval(id);
        void resolveTimeout(activeSessionId, activeQuestion);
        return;
      }
      setNowTs(Date.now());
    }, TIMER_TICK_MS);
    return () => clearInterval(id);
  }, [timerRunning, deadlineTs, activeSessionId, activeQuestion, resolveTimeout]);

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
      if (outcome.data.outcome === 'TIMED_OUT') {
        // La respuesta llegó DESPUÉS de la deadline autoritativa: el
        // servidor la resolvió como timeout (sin recompensa de LP, sin intento).
        setScreen({
          status: 'result',
          sessionId,
          question,
          verdict: 'timeout',
          correctAnswerOptionId: outcome.data.correctAnswerOptionId,
          selectedOptionId,
          explanationContent: null,
          loadingNext: false,
          nextError: null,
        });
        return;
      }
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
      // AMBIGUO -- conserva pendingAttempt (mismo operationId). El
      // temporizador NO se reanuda: la selección ya lo congeló (§3).
      setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: false, submitError: outcome.message } : prev));
      return;
    }

    if (outcome.kind === 'conflict') {
      // 409 DEFINITIVO -- reconciliar con /next, nunca reintentar con el mismo operationId.
      await loadNext(sessionId);
      return;
    }

    // invalid_option / error -- definitivo; descarta el intento, permite
    // elegir de nuevo. El temporizador sigue congelado; no se reanuda.
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

  if (screen.status === 'resolving_timeout') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text variant="heading2" weight="bold" color="secondary">
          Se acabó el tiempo
        </Text>
        <ContentBlockRenderer blocks={screen.question.stemContent} />
        <View style={styles.options}>
          {screen.question.answerOptions.map((option) => (
            <AnswerOptionRow key={option.id} option={option} state="disabled" disabled onSelect={() => undefined} styles={styles} tokens={tokens} />
          ))}
        </View>
        {screen.error ? (
          <>
            <Text variant="bodySmall" color="error">
              {screen.error}
            </Text>
            <Button
              variant="primary"
              label="Reintentar"
              accessibilityLabel="Reintentar"
              onPress={() => resolveTimeout(screen.sessionId, screen.question)}
              style={styles.primaryButton}
            />
          </>
        ) : (
          <View style={styles.centeredInline}>
            <ActivityIndicator color={tokens.color.accent.default} />
            <Text variant="bodySmall" color="secondary">
              Confirmando…
            </Text>
          </View>
        )}
        <Button variant="tertiary" label="Volver a Competir" accessibilityLabel="Volver a Competir" onPress={handleExit} style={styles.exitButton} />
      </ScrollView>
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

  // screen.status === 'result' -- respuesta o timeout CONFIRMADO por el servidor.
  const headlineColor = screen.verdict === 'correct' ? 'success' : screen.verdict === 'incorrect' ? 'error' : 'secondary';
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="heading2" weight="bold" color={headlineColor}>
        {answerHeadline(screen.verdict)}
      </Text>

      {screen.verdict === 'timeout' ? (
        <Text variant="bodySmall" color="secondary">
          No respondiste a tiempo.
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
    centeredInline: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    infoMessage: { textAlign: 'center' as const },
    options: { gap: 10 },
    primaryButton: { marginTop: 4 },
    exitButton: { alignSelf: 'center' as const },
  };
}
