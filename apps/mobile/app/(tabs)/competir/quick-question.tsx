import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { AnswerOptionPublicResponse, ResourceContentBlockResponse } from '@axioma/contracts';
import { openQuickQuestionSession, nextQuickQuestion, answerQuickQuestion, closeQuickQuestionSession } from '../../../lib/api/quick-question';
import { mapNextResult, mapAnswerResult, resolveAnswerOperationId, type QuestionPresented, type PendingAnswerAttempt } from '../../../lib/quick-question/outcomes';
import { ContentBlockRenderer } from '../../../components/content-block-renderer';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type Screen =
  | { status: 'initializing' }
  | { status: 'error'; message: string }
  | { status: 'session_closed' }
  | { status: 'no_questions'; sessionId: string }
  | {
      status: 'question';
      sessionId: string;
      question: QuestionPresented;
      selectedOptionId: string | null;
      submitting: boolean;
      pendingAttempt: PendingAnswerAttempt | null;
      submitError: string | null;
    }
  | { status: 'result'; sessionId: string; isCorrect: boolean; explanationContent: ResourceContentBlockResponse[] | null; loadingNext: boolean; nextError: string | null };

/**
 * Pregunta rápida -- Bloque IV, Incremento 5, sub-incremento 5.d.
 * Consume el backend ya cerrado (4.a-4.c) -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.4. ONLINE-ONLY: sin cola
 * offline (ver `lib/api/quick-question.ts`) -- un fallo de red es un
 * error inmediato con reintento manual, nunca una operación pendiente.
 *
 * Reanudación (precisión #1): al montar, `openSession` -> `next` puede
 * devolver la pregunta pendiente de una sesión YA existente -- se
 * renderiza exactamente igual que una pregunta recién seleccionada, sin
 * ninguna distinción (`mapNextResult` no expone esa diferencia).
 *
 * `close()` SOLO se invoca desde el `onPress` del botón "Salir" --
 * NUNCA desde un efecto de desmontaje ni un handler de back (precisión
 * #4): una sesión ACTIVE simplemente queda abierta para retomarse
 * después. `mountedRef` evita `setState` tras desmontar.
 */
export default function QuickQuestionScreen() {
  const tokens = useTheme();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [screen, setScreen] = useState<Screen>({ status: 'initializing' });
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
      setScreen({ status: 'question', sessionId, question: outcome.question, selectedOptionId: null, submitting: false, pendingAttempt: null, submitError: null });
      return;
    }
    if (outcome.kind === 'no_questions') {
      setScreen({ status: 'no_questions', sessionId });
      return;
    }
    if (outcome.kind === 'session_closed') {
      // Estado TERMINAL -- nunca se abre otra sesión automáticamente (precisión #3).
      setScreen({ status: 'session_closed' });
      return;
    }
    setScreen({ status: 'error', message: outcome.message });
  }

  useEffect(() => {
    init();
  }, [init]);

  function handleSelectOption(optionId: string) {
    setScreen((prev) => (prev.status === 'question' && !prev.submitting ? { ...prev, selectedOptionId: optionId, submitError: null } : prev));
  }

  async function handleSubmit() {
    if (screen.status !== 'question' || screen.selectedOptionId === null || screen.submitting) return;
    const { sessionId, selectedOptionId } = screen;
    const operationId = resolveAnswerOperationId(screen.pendingAttempt, selectedOptionId, randomUUID);

    setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: true, pendingAttempt: { answerOptionId: selectedOptionId, operationId }, submitError: null } : prev));

    const result = await answerQuickQuestion(sessionId, selectedOptionId, operationId);
    if (!mountedRef.current) return;
    const outcome = mapAnswerResult(result);

    if (outcome.kind === 'ok') {
      // Resultado DEFINITIVO -- el operationId se descarta (no se conserva pendingAttempt).
      setScreen({
        status: 'result',
        sessionId,
        isCorrect: outcome.data.isCorrect,
        explanationContent: outcome.data.explanationContent,
        loadingNext: false,
        nextError: null,
      });
      return;
    }

    if (outcome.kind === 'network') {
      // AMBIGUO -- conserva pendingAttempt (mismo operationId en el próximo intento).
      setScreen((prev) => (prev.status === 'question' ? { ...prev, submitting: false, submitError: outcome.message } : prev));
      return;
    }

    if (outcome.kind === 'conflict') {
      // 409 DEFINITIVO -- reconciliar con /next, nunca reintentar con el mismo operationId (precisión #3).
      await loadNext(sessionId);
      return;
    }

    // invalid_option / error -- definitivo, descarta el intento, permite elegir de nuevo (nuevo operationId la próxima vez).
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
        <Text style={styles.infoMessage}>Esta sesión ya se cerró.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a Competir" onPress={() => router.push('/(tabs)/competir')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver a Competir</Text>
        </Pressable>
      </View>
    );
  }

  if (screen.status === 'no_questions') {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoMessage}>No hay preguntas disponibles ahora.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Salir" onPress={handleExit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Salir</Text>
        </Pressable>
      </View>
    );
  }

  if (screen.status === 'question') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ContentBlockRenderer blocks={screen.question.stemContent} />
        <View style={styles.options}>
          {screen.question.answerOptions.map((option) => (
            <AnswerOptionRow
              key={option.id}
              option={option}
              selected={screen.selectedOptionId === option.id}
              disabled={screen.submitting}
              onSelect={() => handleSelectOption(option.id)}
              styles={styles}
            />
          ))}
        </View>
        {screen.submitError ? <Text style={styles.errorMessage}>{screen.submitError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Responder"
          onPress={handleSubmit}
          disabled={screen.selectedOptionId === null || screen.submitting}
          style={[styles.primaryButton, (screen.selectedOptionId === null || screen.submitting) && styles.primaryButtonDisabled]}
        >
          {screen.submitting ? <ActivityIndicator color={tokens.color.text.onAccent} /> : <Text style={styles.primaryButtonText}>Responder</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Salir" onPress={handleExit} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>Salir</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // screen.status === 'result'
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={screen.isCorrect ? styles.correctLabel : styles.incorrectLabel}>{screen.isCorrect ? 'Correcto' : 'Incorrecto'}</Text>
      {screen.explanationContent ? <ContentBlockRenderer blocks={screen.explanationContent} /> : null}
      {screen.nextError ? <Text style={styles.errorMessage}>{screen.nextError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Siguiente pregunta"
        onPress={handleNextQuestion}
        disabled={screen.loadingNext}
        style={[styles.primaryButton, screen.loadingNext && styles.primaryButtonDisabled]}
      >
        {screen.loadingNext ? <ActivityIndicator color={tokens.color.text.onAccent} /> : <Text style={styles.primaryButtonText}>Siguiente pregunta</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Salir" onPress={handleExit} style={styles.exitButton}>
        <Text style={styles.exitButtonText}>Salir</Text>
      </Pressable>
    </ScrollView>
  );
}

function AnswerOptionRow({
  option,
  selected,
  disabled,
  onSelect,
  styles,
}: {
  option: AnswerOptionPublicResponse;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={option.content.type === 'paragraph' ? option.content.text : 'Alternativa'}
      onPress={onSelect}
      disabled={disabled}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <ContentBlockRenderer blocks={[option.content]} />
    </Pressable>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: 16, gap: 16 },
    centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, padding: 24, backgroundColor: t.color.background.default },
    infoMessage: { fontSize: 15, color: t.color.text.secondary, textAlign: 'center' as const },
    options: { gap: 10 },
    option: { borderWidth: 1, borderColor: t.color.border.default, borderRadius: 12, padding: 14, backgroundColor: t.color.background.surface },
    optionSelected: { borderColor: t.color.accent.default, backgroundColor: t.color.accent.subtleBg },
    errorMessage: { fontSize: 13, color: t.color.state.error.text },
    primaryButton: { backgroundColor: t.color.accent.default, paddingVertical: 12, borderRadius: 8, alignItems: 'center' as const },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
    exitButton: { alignSelf: 'center' as const, paddingVertical: 8 },
    exitButtonText: { color: t.color.text.secondary, fontWeight: '600' as const },
    correctLabel: { fontSize: 20, fontWeight: '700' as const, color: t.color.state.success.text },
    incorrectLabel: { fontSize: 20, fontWeight: '700' as const, color: t.color.state.error.text },
  };
}
