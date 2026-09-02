import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { AiAssistanceMode, AiConversationDetailResponse, AiResponseReportType } from '@axioma/contracts';
import { getAiConversation, reportAiMessage, sendAiMessage } from '../../../../lib/api/ai';
import { mapSendMessageResult, resolveSendOperationId, type PendingSendAttempt, type SendMessageOutcome } from '../../../../lib/ai/send-outcome';
import { resolveSendAvailability } from '../../../../lib/ai/conversation-availability';
import { DEFAULT_ASSISTANCE_MODE } from '../../../../lib/ai/assistance-modes';
import { AiMessageBubble, type MessageReportState } from '../../../../components/ai/ai-message-bubble';
import { AiThinkingIndicator } from '../../../../components/ai/ai-thinking-indicator';
import { AiDisclaimer } from '../../../../components/ai/ai-disclaimer';
import { AiModeSelector } from '../../../../components/ai/ai-mode-selector';
import { AiLimitUpsell } from '../../../../components/ai/ai-limit-upsell';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { Text, Button } from '../../../../components/ui';
import { useTheme, useThemedStyles } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; detail: AiConversationDetailResponse };

/** Estado del envío en curso/fallido -- separado del estado de carga de la pantalla y del render. */
type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'failed'; outcome: Exclude<SendMessageOutcome, { kind: 'ok' }>; retryable: boolean };

/**
 * Una conversación con el Tutor IA -- LEF Bloque VI, Incremento 8
 * (docs/adr/LEF-BLOCK-VI-DEFINITION.md §28).
 *
 * TODO lo que gobierna esta pantalla lo decide el backend: cuota diaria,
 * turnos, idempotencia, pedagogía, seguridad, contexto académico y ownership.
 * Aquí no hay ninguna regla de negocio duplicada -- ni números de plan, ni
 * conteo propio de turnos, ni moderación local, ni XP/progreso/ranking.
 *
 * SIN actualización optimista: el mensaje del estudiante y la respuesta del
 * Tutor se pintan ÚNICAMENTE a partir de la respuesta canónica del servidor
 * (`userMessage`/`assistantMessage`), y la cuota/turnos se sustituyen por los
 * valores que esa misma respuesta trae. Ante cualquier fallo se recarga la
 * conversación desde el servidor -- nunca queda un mensaje fantasma ni una
 * cuota inventada.
 *
 * IDEMPOTENCIA (Incremento 3): `operationId` lo provee el cliente. Un
 * reintento de la MISMA operación lógica (mismo texto pendiente) reutiliza
 * EXACTAMENTE el mismo `operationId` (ver `resolveSendOperationId`); cambiar
 * el texto es una operación NUEVA y obtiene uno nuevo. El doble toque se
 * bloquea localmente además de estar cubierto por la idempotencia del
 * servidor.
 */
export default function AiConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView | null>(null);

  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<AiAssistanceMode | null>(DEFAULT_ASSISTANCE_MODE);
  const [sendState, setSendState] = useState<SendState>({ status: 'idle' });
  const [pending, setPending] = useState<PendingSendAttempt | null>(null);
  const [reportStates, setReportStates] = useState<Record<string, MessageReportState>>({});

  const load = useCallback(async () => {
    const result = await getAiConversation(conversationId);
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', detail: result.data });
  }, [conversationId]);

  useEffect(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  // Al abrir el teclado, mantener a la vista el final de la conversación
  // (último mensaje + estado "pensando") -- el `onContentSizeChange` del
  // ScrollView ya cubre el autoscroll cuando el contenido crece; esto cubre
  // el caso "el contenido no cambió pero el teclado tapó el final".
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => sub.remove();
  }, []);

  async function submit(content: string) {
    if (sendState.status === 'sending') return; // anti doble-toque local.
    if (state.status !== 'ready') return;
    const trimmed = content.trim();
    if (!trimmed) return;

    // Reintento de la MISMA operación -> mismo operationId; texto distinto -> operación nueva.
    const operationId = resolveSendOperationId(pending, trimmed, randomUUID);
    setPending({ content: trimmed, operationId });
    setSendState({ status: 'sending' });

    const outcome = mapSendMessageResult(await sendAiMessage(conversationId, { content: trimmed, operationId, requestedMode: mode }));

    if (outcome.kind === 'ok') {
      // Reconciliación canónica: mensajes y contadores vienen del servidor, nunca del cliente.
      setPending(null);
      setDraft('');
      setSendState({ status: 'idle' });
      setState((prev) =>
        prev.status === 'ready'
          ? {
              status: 'ready',
              detail: {
                ...prev.detail,
                messages: [...prev.detail.messages, outcome.data.userMessage, outcome.data.assistantMessage],
                turnCount: outcome.data.turnCount,
                maxTurns: outcome.data.maxTurns,
                dailyQuota: outcome.data.dailyQuota,
                academicContext: outcome.data.academicContext,
              },
            }
          : prev,
      );
      return;
    }

    // Un fallo puede haber dejado el mensaje del estudiante YA persistido en
    // el servidor (p. ej. bloqueo de seguridad o fallo técnico posterior a la
    // admisión) -- se recarga la conversación para reflejar exactamente lo
    // que existe, en vez de adivinarlo.
    await load();
    // `network`/`unavailable` son AMBIGUOS o transitorios: el reintento debe
    // reusar el mismo `operationId` (se conserva `pending`). El resto son
    // respuestas definitivas del servidor sobre ESTA operación.
    const retryable = outcome.kind === 'network' || outcome.kind === 'unavailable';
    if (!retryable) setPending(null);
    setSendState({ status: 'failed', outcome, retryable });
  }

  async function handleReport(messageId: string, reportType: AiResponseReportType) {
    if (reportStates[messageId]?.status === 'sending' || reportStates[messageId]?.status === 'sent') return; // anti doble-toque.
    setReportStates((prev) => ({ ...prev, [messageId]: { status: 'sending' } }));
    const result = await reportAiMessage(conversationId, messageId, { reportType });
    setReportStates((prev) => ({
      ...prev,
      [messageId]: result.ok ? { status: 'sent' } : { status: 'idle', error: result.message },
    }));
  }

  if (state.status === 'loading') return <LoadingState message="Cargando conversación…" />;
  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          setState({ status: 'loading' });
          void load();
        }}
      />
    );
  }

  const { detail } = state;
  const availability = resolveSendAvailability({ dailyQuota: detail.dailyQuota, turnCount: detail.turnCount, maxTurns: detail.maxTurns });
  const sending = sendState.status === 'sending';
  const inputDisabled = !availability.canSend || sending;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/*
        AI-2A -- la cuota deja de mostrarse en esta pantalla (ya vive en el
        Home del Tutor IA); `detail.dailyQuota`/`turnCount`/`maxTurns` siguen
        leyéndose más abajo para `resolveSendAvailability` (invariante
        funcional, no solo visual). El disclaimer se conserva, real y
        textual (`detail.disclaimer`), ahora más discreto en el header.
      */}
      <View style={styles.header}>
        {detail.academicContext ? (
          <Text variant="caption" color="secondary">
            Contexto: {detail.academicContext.subjectName} · {detail.academicContext.topicName}
          </Text>
        ) : null}
        <AiDisclaimer text={detail.disclaimer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {detail.messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text variant="titleMedium" weight="bold">
              Conversación nueva
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
              Escribe tu duda para empezar. El Tutor te ayuda a comprender, no reemplaza tu práctica.
            </Text>
          </View>
        ) : (
          detail.messages.map((message) => (
            <AiMessageBubble key={message.id} message={message} reportState={reportStates[message.id]} onReport={handleReport} />
          ))
        )}

        {/*
          Mientras `sending`: se muestra el texto que el estudiante acaba de
          enviar (echo transitorio de `pending.content`, el mismo que estaba
          en el composer) + el indicador animado "Tutor IA está pensando".
          NO es una actualización optimista: `pending`/el echo desaparecen en
          cuanto llega la respuesta canónica del servidor (`userMessage`/
          `assistantMessage`), que es lo único que se pinta como mensaje real.
        */}
        {sending && pending ? (
          <View style={[styles.pendingUser, styles.bubbleUser]}>
            <Text variant="caption" color="muted" style={styles.pendingUserAuthor}>
              Tú
            </Text>
            <Text variant="body" style={styles.pendingUserText}>
              {pending.content}
            </Text>
          </View>
        ) : null}
        {sending ? <AiThinkingIndicator /> : null}
      </ScrollView>

      {/*
        Si el envío falló por un límite (409) y el estado ya resuelto por el
        servidor confirma que no se puede enviar, se muestra UNA sola
        explicación (la de abajo) -- nunca dos mensajes casi idénticos para
        la misma causa.
      */}
      {sendState.status === 'failed' && !(sendState.outcome.kind === 'limit' && !availability.canSend) ? (
        <View
          style={[
            styles.notice,
            sendState.outcome.kind === 'safety_blocked' ? styles.noticeSafety : styles.noticeError,
          ]}
          accessibilityRole="alert"
        >
          <Text
            variant="bodySmall"
            style={sendState.outcome.kind === 'safety_blocked' ? styles.noticeSafetyText : styles.noticeErrorText}
          >
            {sendState.outcome.message}
          </Text>
          {sendState.retryable && pending ? (
            <Button
              variant="tertiary"
              label="Reintentar"
              accessibilityLabel="Reintentar envío"
              onPress={() => submit(pending.content)}
              disabled={sending}
              style={styles.retryButton}
            />
          ) : null}
        </View>
      ) : null}

      {!availability.canSend ? (
        <View style={styles.blockedBox} accessibilityRole="alert">
          <Text variant="bodySmall" style={styles.blockedText}>
            {availability.message}
          </Text>
        </View>
      ) : null}

      {/*
        C2.4 -- upsell OPCIONAL: solo se pinta si la cuenta es FREE confirmada
        y el Tutor ya esta bloqueado por el estado de cuota/turnos derivado del
        servidor (`!availability.canSend`). El componente decide por si mismo
        (entitlement + `blocked`); aqui no hay logica de plan. Nunca abre el
        paywall solo -- solo su CTA lo hace.
      */}
      <AiLimitUpsell blocked={!availability.canSend} />

      {/*
        AI-2A -- composer integrado (mismo patrón visual ya aprobado en
        Tutor IA Home, AI-1B/1J): TextInput arriba, selector de modo abajo a
        la izquierda, envío abajo a la derecha, en una sola superficie.
        `draft`/`submit`/`sending`/`inputDisabled`/`KeyboardAvoidingView` sin
        ningún cambio de lógica.
      */}
      <View style={styles.composerCard}>
        <TextInput
          accessibilityLabel="Escribe tu mensaje para el Tutor IA"
          placeholder={availability.canSend ? 'Pregúntale al tutor…' : 'Envío no disponible'}
          placeholderTextColor={tokens.color.text.muted}
          selectionColor={tokens.color.accent.default}
          cursorColor={tokens.color.accent.default}
          value={draft}
          onChangeText={setDraft}
          editable={!inputDisabled}
          multiline
          maxLength={4000}
          style={[styles.input, inputDisabled && styles.inputDisabled]}
        />
        <View style={styles.composerRow}>
          <AiModeSelector value={mode} onChange={setMode} disabled={inputDisabled} />
          <Button
            variant="primary"
            label="Enviar"
            accessibilityLabel="Enviar mensaje"
            onPress={() => submit(draft)}
            disabled={inputDisabled || !draft.trim()}
            loading={sending}
            style={styles.sendButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    header: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    messages: { flex: 1 },
    messagesContent: { gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
    emptyBox: {
      gap: 6,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 12,
      padding: 16,
    },
    emptyText: { lineHeight: 19 },
    // Echo transitorio del mensaje recién enviado -- mismo look que la
    // burbuja real del usuario (`ai-message-bubble.tsx`), alineado a la
    // derecha, visible solo mientras `sending`.
    pendingUser: {
      alignSelf: 'flex-end' as const,
      maxWidth: '85%' as const,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 4,
    },
    bubbleUser: { backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default },
    pendingUserAuthor: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    pendingUserText: { color: t.color.text.primary },
    notice: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
    noticeError: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    noticeErrorText: { color: t.color.state.error.text },
    noticeSafety: { backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border },
    noticeSafetyText: { color: t.color.state.warning.text },
    retryButton: { alignSelf: 'flex-start' as const },
    blockedBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.color.state.warning.border,
      backgroundColor: t.color.state.warning.background,
      borderRadius: 8,
      padding: 10,
    },
    blockedText: { color: t.color.state.warning.text },
    // AI-2A -- una sola superficie (mismo patrón que el composer de Home):
    // borde sutil, radio del design system, sin sombra fuerte.
    composerCard: {
      margin: 16,
      marginTop: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 16,
      padding: 14,
    },
    composerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    input: {
      minHeight: 44,
      maxHeight: 120,
      color: t.color.text.primary,
      paddingVertical: 4,
      fontSize: 15,
    },
    inputDisabled: { color: t.color.action.disabledText },
    sendButton: { minWidth: 88 },
  };
}
