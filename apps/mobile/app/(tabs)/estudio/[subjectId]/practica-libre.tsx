import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestionResponse, ResourceContentBlockResponse } from '@axioma/contracts';
import { samplePracticeQuestion, answerPracticeQuestion } from '../../../../lib/api/practice';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../components/content-block-renderer';
import { IconButton, Text, Button, AnswerOption, Icon } from '../../../../components/ui';
import type { AnswerOptionState } from '../../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

/**
 * ESTUDIO / PRÁCTICA LIBRE V1 -- práctica CONTINUA y STATELESS de preguntas
 * aleatorias de la materia. Lane SEPARADO del académico
 * (`lib/api/practice.ts`): responder aquí NO crea `student_response`, NO toca
 * `TopicProgress` / progreso de Recursos-Unidades / "Continuar estudiando" de
 * Inicio, NO otorga XP/LP, NO avanza desafíos, NO usa la cola offline.
 *
 * Reutiliza el lenguaje visual del ejercicio de Estudio (`AnswerOption`,
 * `ContentBlockRenderer`, retroalimentación, "Continuar") SIN importar su
 * pantalla ni su lógica de recorrido (progreso, "Unidad completada",
 * `resourceFlowNav`).
 *
 * `seenRef` (`questionVersionId` ya mostradas) vive SOLO en memoria: al
 * entrar es `[]`, al salir se destruye. Reentrar = nueva ejecución = nueva
 * selección aleatoria; puede repetir preguntas de ejecuciones anteriores.
 */
type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'exhausted' }
  | { status: 'question'; question: QuestionResponse };

interface AnswerState {
  answerOptionId: string;
  isCorrect: boolean;
}

export default function PracticaLibreScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);

  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  /** `questionVersionId` ya vistas en ESTA ejecución -- solo en memoria, nunca persistidas. */
  const seenRef = useRef<Set<string>>(new Set());

  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);

  const resetAnswerState = useCallback(() => {
    setAnswer(null);
    setSelectedOptionId(null);
    setSubmitError(null);
    setNextError(null);
  }, []);

  const requestQuestion = useCallback(async () => {
    const result = await samplePracticeQuestion(subjectId, [...seenRef.current]);
    if (!result.ok) {
      return { ok: false as const, message: result.message };
    }
    const question = result.data.question;
    if (question === null) {
      return { ok: true as const, question: null };
    }
    seenRef.current.add(question.versionId);
    return { ok: true as const, question };
  }, [subjectId]);

  const loadFirst = useCallback(async () => {
    setState({ status: 'loading' });
    resetAnswerState();
    const outcome = await requestQuestion();
    if (!outcome.ok) {
      setState({ status: 'error', message: outcome.message });
      return;
    }
    if (outcome.question === null) {
      setState({ status: 'empty' });
      return;
    }
    setState({ status: 'question', question: outcome.question });
  }, [requestQuestion, resetAnswerState]);

  // Carga única al montar -- sin refresh-on-focus, sin polling (mismo criterio
  // que el resto de Estudio). Salir destruye la pantalla y `seenRef`.
  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  async function handleSelect(question: QuestionResponse, answerOptionId: string) {
    if (submitting || loadingNext || answer) return;
    setSelectedOptionId(answerOptionId);
    setSubmitError(null);
    setSubmitting(true);

    const result = await answerPracticeQuestion(subjectId, question.versionId, answerOptionId);
    setSubmitting(false);

    if (result.ok) {
      // Server-authoritative: nunca se marca correcto/incorrecto localmente
      // sin la respuesta del servidor.
      setAnswer({ answerOptionId: result.data.answerOptionId, isCorrect: result.data.isCorrect });
      return;
    }
    // Sin outbox: el fallo NO avanza; se mantiene la pregunta y la selección
    // se limpia para poder reintentar.
    setSelectedOptionId(null);
    setSubmitError(
      result.kind === 'network'
        ? 'No se pudo enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.'
        : result.message,
    );
  }

  async function handleContinue() {
    if (loadingNext || submitting) return;
    setLoadingNext(true);
    setNextError(null);
    const outcome = await requestQuestion();
    setLoadingNext(false);
    if (!outcome.ok) {
      // Se mantiene la pregunta anterior con su retroalimentación; el usuario
      // puede reintentar "Continuar".
      setNextError('No se pudo cargar la siguiente pregunta. Inténtalo de nuevo.');
      return;
    }
    if (outcome.question === null) {
      setState({ status: 'exhausted' });
      return;
    }
    resetAnswerState();
    setState({ status: 'question', question: outcome.question });
  }

  if (state.status === 'loading') return <LoadingState message="Cargando práctica…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={loadFirst} />;
  if (state.status === 'empty') {
    return <EmptyState message="Todavía no hay preguntas disponibles para esta materia." />;
  }
  if (state.status === 'exhausted') {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.badge}>
          <Icon name="check" size={28} color={tokens.color.state.success.text} />
        </View>
        <Text variant="heading2" accessibilityRole="header">
          Práctica completada
        </Text>
        <Text variant="body" color="secondary" style={styles.centeredText}>
          Has practicado todas las preguntas disponibles de esta materia.
        </Text>
        <Button variant="primary" label="Salir" onPress={() => router.back()} style={styles.exhaustedButton} />
      </View>
    );
  }

  const { question } = state;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Salir de la práctica" onPress={() => router.back()} color="secondary" />
        {name ? (
          <Text variant="label" color="secondary" style={styles.subjectLabel}>
            {name}
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <StemContent blocks={question.stemContent} />
        <Text variant="bodySmall" color="secondary">
          Selecciona la alternativa correcta.
        </Text>

        {submitError ? (
          <Text variant="bodySmall" color="error">
            {submitError}
          </Text>
        ) : null}

        <View style={styles.options}>
          {question.answerOptions.map((option, optionIndex) => {
            const isSelected = (answer?.answerOptionId ?? selectedOptionId) === option.id;
            let optionState: AnswerOptionState = 'default';
            if (isSelected && answer?.isCorrect === true) optionState = 'correct';
            else if (isSelected && answer?.isCorrect === false) optionState = 'incorrect';
            else if (isSelected && submitting) optionState = 'submitting';

            return (
              <AnswerOption
                key={option.id}
                label={String.fromCharCode(65 + optionIndex)}
                state={optionState}
                disabled={!!answer || submitting || loadingNext}
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                onPress={() => handleSelect(question, option.id)}
              >
                <ContentBlockRenderer blocks={[option.content]} />
              </AnswerOption>
            );
          })}
        </View>

        {answer ? (
          <View style={[styles.feedback, answer.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Text weight="bold" color={answer.isCorrect ? 'success' : 'error'}>
              {answer.isCorrect ? 'Correcto' : 'Incorrecto'}
            </Text>
            <ContentBlockRenderer blocks={question.explanationContent} />
          </View>
        ) : null}

        {nextError ? (
          <Text variant="bodySmall" color="error">
            {nextError}
          </Text>
        ) : null}
      </ScrollView>

      {answer ? (
        <Button
          variant="primary"
          label={nextError ? 'Reintentar' : 'Continuar'}
          onPress={handleContinue}
          disabled={loadingNext}
          style={styles.continueButton}
        />
      ) : null}
    </View>
  );
}

/**
 * Copia local del `StemContent` de `topic/[topicId]/ejercicio.tsx` (STUDY-5)
 * -- ese archivo está fuera de alcance y no se modifica. Enunciado de un
 * único `paragraph` -> `heading3`; cualquier otra forma (incl. las preguntas
 * de Lenguaje, que traen el texto de comprensión embebido como varios
 * bloques) cae en el `ContentBlockRenderer` genérico ya existente.
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
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space2,
      marginBottom: spacing.space4,
    },
    subjectLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    content: { gap: 14, paddingBottom: 24 },
    options: { gap: spacing.space3 },
    feedback: { gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
    feedbackCorrect: { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border },
    feedbackIncorrect: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    continueButton: { marginTop: 8 },
    centered: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 14,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    centeredText: { textAlign: 'center' as const },
    badge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.color.state.success.background,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    exhaustedButton: { marginTop: 8, alignSelf: 'stretch' as const },
  };
}
