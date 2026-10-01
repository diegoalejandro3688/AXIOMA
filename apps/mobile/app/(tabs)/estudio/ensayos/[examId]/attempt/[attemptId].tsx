import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttemptQuestion, ExamAttemptStateResponse, ExamPassageView } from '@axioma/contracts';
import {
  getExamAttempt,
  getExamAttemptQuestions,
  answerExamQuestion,
  submitExamAttempt,
  getExamRewardStatus,
} from '../../../../../../lib/api/exams';
import { forgetActiveAttempt } from '../../../../../../lib/exams/attempt-cache';
import { armStudyProgressReconciliation } from '../../../../../../lib/progress/study-progress-reconciliation';
import { addOptimisticXp, XP_REWARD_BY_ACTIVITY_TYPE } from '../../../../../../lib/progress/instant-xp-store';
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
import { PassageCard } from '../../../../../../components/exams/passage-card';
import { ExamQuestionNavigator, type NavigatorCellState } from '../../../../../../components/exams/exam-question-navigator';
import { IconButton, Text, Button, AnswerOption, Dialog, RewardBurst } from '../../../../../../components/ui';
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
      /** ENSAYOS-F2 -- textos compartidos, cada uno UNA sola vez. `[]` en M1/M2. */
      passages: ExamPassageView[];
      selections: SelectionMap;
      timing: TimingRef;
    };

/**
 * VC4 MICROBLOQUE 11 -- ventana ACOTADA (no infinita, no "spinner de 60
 * segundos") de reconciliación del estado REAL de recompensa tras un
 * `submit` aceptado. `XpGrantScheduler` real puede tardar ~1 min (ver P0.3)
 * -- esta ventana es deliberadamente más corta: intenta capturar una
 * confirmación RÁPIDA para mostrar el burst una sola vez, pero NUNCA bloquea
 * al estudiante como un requisito -- si la ventana se agota sin GRANTED, se
 * navega al resultado igual, sin burst (§12 del bloque: "aceptable no
 * mostrar RewardBurst si la confirmación llega demasiado tarde, antes que
 * mostrar un RewardBurst falso" -- CORRECCIÓN sobre animación). El XP real
 * queda reflejado de todos modos vía el refresh autoritativo existente de
 * Inicio (`reconcileXp`), sin relación con si este poll alcanzó a verlo.
 */
const REWARD_POLL_OFFSETS_MS = [0, 4000, 9000, 15000];

/**
 * Consulta `GET /exams/:examId/reward-status` en los offsets de
 * `REWARD_POLL_OFFSETS_MS` -- se detiene en cuanto observa GRANTED, o al
 * agotar la ventana. `isCancelled()` se revisa ANTES de cada intento (nunca
 * después) -- si la pantalla se desmontó, no se agenda ni se espera el
 * siguiente `setTimeout`, y no se actualiza ningún estado de React.
 */
type RewardPollResult = { granted: false; xpAmount: null } | { granted: true; xpAmount: number };

async function pollExamRewardGranted(examId: string, isCancelled: () => boolean): Promise<RewardPollResult> {
  let previousOffset = 0;
  for (const offset of REWARD_POLL_OFFSETS_MS) {
    if (isCancelled()) return { granted: false, xpAmount: null };
    const wait = offset - previousOffset;
    previousOffset = offset;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    if (isCancelled()) return { granted: false, xpAmount: null };
    const result = await getExamRewardStatus(examId);
    if (isCancelled()) return { granted: false, xpAmount: null };
    // Invariante del contrato (VC4 MICROBLOQUE 11, ver examRewardStatusResponseSchema):
    // GRANTED SIEMPRE trae xpAmount no-nulo -- `result.data.xpAmount ?? 0`
    // es defensivo solo contra un error de validación/parseo, nunca un
    // valor esperado en la práctica.
    if (result.ok && result.data.status === 'GRANTED') {
      return { granted: true, xpAmount: result.data.xpAmount ?? 0 };
    }
  }
  return { granted: false, xpAmount: null };
}

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
  /**
   * ENSAYOS-F2 -- estado de plegado por `passageId` (texto expandido por
   * defecto). Es SOLO presentación: no es un segundo índice de pregunta, no
   * afecta a `currentIndex` ni a las selecciones.
   */
  const [collapsedPassages, setCollapsedPassages] = useState<Record<string, boolean>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // VC4 MICROBLOQUE 5 -- MISMA señal que ya dispara el overlay optimista de
  // XP (`result.ok` dentro de `handleSubmit`), nunca una fuente propia.
  const [essayBurst, setEssayBurst] = useState(false);
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
        passages: qResult.data.passages,
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
    // VC4 MICROBLOQUE 11 -- PRE-QA CONSISTENCY FIX: baseline AUTORITATIVO
    // ANTES del submit. Sin esto, un replay de un examen YA recompensado
    // (p. ej. ENSAYO.M2 tras P0.3) hacía que el PRIMER chequeo de
    // `pollExamRewardGranted` (offset 0, inmediatamente después del submit)
    // observara GRANTED -- indistinguible, con solo `status === 'GRANTED'`,
    // de una recompensa RECIÉN otorgada por ESTE submit. `status` por sí
    // solo nunca alcanza: lo que distingue "ya estaba" de "recién ocurrió"
    // es la TRANSICIÓN PENDING(antes)->GRANTED(después), nunca un snapshot
    // aislado. Se consulta ANTES de abrir/cerrar el modal y ANTES del
    // propio submit -- secuencial, no en paralelo, para que "antes" sea
    // real y no una carrera con el submit mismo.
    //
    // Fail-closed ante error de red: si este chequeo falla, se asume
    // `wasGrantedBeforeSubmit = true` (el estado MÁS conservador) -- peor
    // caso es "no se ve un burst legítimo", nunca "se ve un burst falso"
    // (§4: corrección > burst garantizado).
    const baseline = await getExamRewardStatus(examId);
    const wasGrantedBeforeSubmit = !baseline.ok || baseline.data.status === 'GRANTED';
    // VC4 MICROBLOQUE 5E -- ROOT CAUSE del RewardBurst de ensayo invisible en
    // QA física: `Dialog` (el modal "¿Quieres entregar el ensayo?") usa el
    // `<Modal>` NATIVO de React Native (`components/ui/dialog.tsx`), que
    // renderiza en una capa nativa SIEMPRE por encima del árbol de vistas de
    // React -- `<RewardBurst>`, un `View` hermano normal, NUNCA puede
    // aparecer visualmente por encima de él mientras está abierto o
    // cerrándose. Antes, `setConfirmSubmit(false)` se disparaba recién
    // cuando llegaba la respuesta del servidor, en el MISMO instante que
    // `setEssayBurst(true)` -- el fade de cierre nativo del modal (real,
    // aunque breve) competía exactamente con el arranque del burst y se
    // comía su fase de pop/lectura. Cerrar el modal AQUÍ, ANTES del envío,
    // usa el propio round-trip de red (`submitExamAttempt`, inherentemente
    // más largo que el fade de cierre del modal) como margen real -- nunca
    // un `setTimeout` ni un número mágico.
    setConfirmSubmit(false);
    setSubmitting(true);
    const result = await submitExamAttempt(attemptId);
    if (!mounted.current) return;
    setSubmitting(false);
    if (result.ok || (result.kind === 'http' && result.status === 409)) {
      // STABILIZATION-B8 (Polish F) -- ensayo enviado: se producirá
      // ENSAYO_COMPLETADO, cuyo XP + evaluación de Desafíos llega asíncrono.
      // Inicio/Competir mostrarán "Actualizando progreso…" de forma acotada.
      if (result.ok) {
        armStudyProgressReconciliation();
        await forgetActiveAttempt(examId);
        // VC4 MICROBLOQUE 11 -- ROOT CAUSE del bug reportado por QA: ANTES,
        // `addOptimisticXp`/`setEssayBurst` se disparaban aquí SOLO porque
        // `result.ok` (HTTP 200 de submit) -- eso confunde `justCompleted`
        // (este ExamAttempt transicionó ACTIVE->COMPLETED) con "el backend
        // YA otorgó +100 XP real". La identidad de recompensa real es
        // (accountId, examId), deduplicada por GAMIFICATION de forma
        // INDEPENDIENTE del intento -- un segundo/tercer intento del MISMO
        // examen también tiene `result.ok === true` pero NUNCA debe mostrar
        // el burst ni sumar XP optimista otra vez.
        //
        // PRE-QA CONSISTENCY FIX: `status === 'GRANTED'` por sí solo NUNCA
        // basta (un replay de un examen ya recompensado observaría GRANTED
        // en el PRIMER chequeo, offset 0). Sólo se hace polling -- y sólo
        // una transición PENDING(antes)->GRANTED(después) puede disparar el
        // burst -- cuando `wasGrantedBeforeSubmit === false`. Si YA estaba
        // GRANTED antes de este submit, se salta el poll por completo: cero
        // red extra, cero burst, cero XP optimista, navegación inmediata.
        if (wasGrantedBeforeSubmit) {
          goToResult();
          return;
        }
        const { granted, xpAmount } = await pollExamRewardGranted(examId, () => !mounted.current);
        if (!mounted.current) return;
        if (granted) {
          // `xpAmount` es SIEMPRE un número real cuando granted === true --
          // ver invariante GRANTED⇒xpAmount≠null en examRewardStatusResponseSchema
          // (contracts) y ExamRewardStatusService (backend): GRANTED sólo se
          // produce cuando existe un XpLedgerEntry real, cuyo xpAmount NUNCA
          // es null en el esquema de base de datos. Nunca se inventa/usa un
          // 100 hardcodeado como respaldo de un valor autoritativo ausente.
          //
          // Overlay optimista SOLO ahora, con evidencia autoritativa real de
          // una transición GENUINA (nunca antes, nunca sobre un GRANTED
          // preexistente) -- `reconcileXp` (instant-xp-store.ts) ya
          // autocorrige este delta contra el `lifetimeXp` real la próxima
          // vez que Inicio refresque (el otorgamiento real ya movió
          // `xp_balance` en el mismo momento en que escribió el
          // XpLedgerEntry que este poll observó) -- nunca produce
          // authoritative+optimistic = +200 visible.
          addOptimisticXp(xpAmount);
          // VC4 MICROBLOQUE 5 -- el burst se muestra AQUÍ (esta pantalla),
          // NUNCA en el resultado: esa pantalla documenta explícitamente
          // (ADR-0024) que NUNCA muestra XP/LP/racha/liga. `goToResult()`
          // se pospone hasta que el burst termina (`onComplete`).
          setEssayBurst(true);
          return;
        }
        // Ventana acotada agotada sin observar la transición a GRANTED (el
        // otorgamiento real simplemente tardó más que la ventana): NUNCA
        // burst falso, NUNCA XP optimista sin evidencia. El XP real queda
        // reflejado de todos modos por el refresh autoritativo existente de
        // Inicio.
        goToResult();
        return;
      }
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
  // ENSAYOS-F2 -- el texto de la pregunta actual, resuelto por `passageId`
  // desde el mapa `passages` (renderizado una sola vez, sin importar cuántas
  // preguntas lo compartan). `null` -> no se muestra ninguna PassageCard.
  const currentPassage = currentQuestion.passageId
    ? state.passages.find((p) => p.id === currentQuestion.passageId) ?? null
    : null;
  const { answered, unanswered } = countProgress(state.questions, state.selections);

  const navigatorStates: NavigatorCellState[] = state.questions.map((q, index) =>
    navCellState({ isCurrent: index === safeIndex, isAnswered: !!state.selections[q.questionVersionId] }),
  );

  return (
    // VC4 MICROBLOQUE 5F.2 -- ROOT CAUSE del hueco bajo "Entregar ensayo":
    // esta pantalla vive DENTRO del Tabs raíz ((tabs)/_layout.tsx) -- la
    // bottom tab bar es un HERMANO del Stack de Estudio, no algo que esta
    // pantalla deba compensar. React Navigation's `BottomTabBar` YA suma
    // `insets.bottom` a su propia altura/padding internamente (misma fuente
    // `useSafeAreaInsets` que usa este archivo) -- sumar `insets.bottom` OTRA
    // VEZ aquí duplicaba esa reserva de safe-area (una vez consumida por la
    // tab bar, otra vez por este padding), lo que explica por qué reducir
    // +16 -> +8 apenas cambió nada: el término dominante siempre fue
    // `insets.bottom` en sí (20-48px típico), no el +8/+16 fijo. El área de
    // contenido de este Stack YA queda posicionada por encima de la tab bar
    // por el propio navegador -- sólo hace falta un respiro fijo pequeño,
    // sin volver a sumar el inset.
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: spacing.space4 }]}>
      <View style={styles.header}>
        {/* VC4 MICROBLOQUE 5E.1 -- `disabled={submitting}` cierra el hueco de
            interacción que abrió 5E: cerrar el Dialog ANTES del round-trip
            (necesario para que RewardBurst no quedara tapado, ver docstring
            de handleSubmit) dejó de bloquear el resto de la pantalla durante
            `await submitExamAttempt`, que antes el propio Modal nativo
            bloqueaba gratis. `submitting` YA existía (gate del doble-submit
            en handleSubmit) -- se reutiliza aquí, sin Modal nuevo, sin
            timeout, sin volver a tapar el burst. */}
        <IconButton name="close" accessibilityLabel="Salir del ensayo" onPress={() => router.back()} color="secondary" disabled={submitting} />
        <View style={styles.headerTexts}>
          {/* VC4 MICROBLOQUE 5F -- polish de densidad: "Pregunta X de N" y el
              contador "respondidas" vivían en DOS filas separadas (esta y la
              del toggle "Ver preguntas" de abajo), compitiendo por altura sin
              aportar jerarquía extra -- misma información, ahora UNA sola
              fila. No se quita ningún dato, sólo se reagrupa. */}
          <Text variant="label" color="secondary" style={styles.progressLabel}>
            Pregunta {currentQuestion.displayOrder} de {total}
          </Text>
          <Text variant="label" color="secondary">
            {answered}/{total} respondidas
          </Text>
        </View>
        <ExamCountdown expiresAt={state.timing.expiresAt} serverTime={state.timing.serverTime} onExpire={refreshAttemptState} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={navigatorOpen ? 'Ocultar el listado de preguntas' : 'Ver el listado de preguntas'}
        onPress={() => setNavigatorOpen((open) => !open)}
        style={styles.navToggle}
      >
        <Text variant="bodySmall" color="secondary">
          {navigatorOpen ? 'Ocultar preguntas' : 'Ver preguntas'}
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
        {currentPassage ? (
          <PassageCard
            passage={currentPassage}
            collapsed={collapsedPassages[currentPassage.id] ?? false}
            onToggle={() =>
              setCollapsedPassages((prev) => ({ ...prev, [currentPassage.id]: !(prev[currentPassage.id] ?? false) }))
            }
          />
        ) : null}
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
                disabled={pendingOptionId !== null || submitting}
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
            disabled={safeIndex === 0 || submitting}
            onPress={() => setCurrentIndex((i) => Math.max(0, Math.min(i, total - 1) - 1))}
          />
          <Button
            variant="secondary"
            size="small"
            label="Siguiente"
            disabled={safeIndex === total - 1 || submitting}
            onPress={() => setCurrentIndex((i) => Math.min(total - 1, Math.max(i, 0) + 1))}
          />
        </View>
        <Button
          variant="primary"
          label="Entregar ensayo"
          onPress={() => setConfirmSubmit(true)}
          accessibilityLabel="Entregar ensayo"
          disabled={submitting}
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

      {/* VC4 MICROBLOQUE 5F.1 -- montado AL FINAL (último hermano del árbol),
          no al principio: en React Native el orden de pintado de hermanos
          superpuestos sigue el orden del árbol cuando no hay `zIndex`
          diferenciado -- header/ScrollView/footer, renderizados DESPUÉS,
          quedaban por encima aunque el burst usara `position:absolute`. El
          `zIndex`/`elevation` ya añadidos en `reward-burst.tsx` bastan por
          sí solos, pero montarlo al final es la segunda capa de seguridad
          (orden de árbol coincidiendo con el z-order deseado), sin depender
          de un solo mecanismo. */}
      {essayBurst ? (
        <RewardBurst
          amount={XP_REWARD_BY_ACTIVITY_TYPE.ENSAYO_COMPLETADO}
          kind="essay"
          onComplete={() => {
            setEssayBurst(false);
            goToResult();
          }}
        />
      ) : null}
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
      marginBottom: spacing.space3,
    },
    headerTexts: { flex: 1, gap: 2 },
    progressLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    navToggle: {
      alignSelf: 'flex-start' as const,
      paddingVertical: spacing.space2,
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
    // VC4 MICROBLOQUE 5F -- polish de densidad: más aire entre el enunciado
    // y las alternativas (gap 14 -> 18), sin tocar contenido/fontSize.
    content: { gap: 18, paddingBottom: 32 },
    options: { gap: spacing.space3 },
    // Más separación entre Anterior/Siguiente y "Entregar ensayo" (CTA final
    // claramente diferenciado, §12) + más aire respecto a la bottom tab bar
    // global (que se mantiene visible, ver auditoría §13 -- sólo se le da
    // más margen, no se oculta nada).
    footer: { gap: spacing.space3, paddingTop: spacing.space3 },
    navRow: { flexDirection: 'row' as const, gap: spacing.space2 },
  };
}
