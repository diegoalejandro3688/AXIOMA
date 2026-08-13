import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { AiAssistanceMode, AiConversationDetailResponse, AiResponseReportType } from '@axioma/contracts';
import { getAiConversation, reportAiMessage, sendAiMessage } from '../../../../lib/api/ai';
import { mapSendMessageResult, resolveSendOperationId, type PendingSendAttempt, type SendMessageOutcome } from '../../../../lib/ai/send-outcome';
import { resolveSendAvailability } from '../../../../lib/ai/conversation-availability';
import { DEFAULT_ASSISTANCE_MODE } from '../../../../lib/ai/assistance-modes';
import { AiMessageBubble, type MessageReportState } from '../../../../components/ai/ai-message-bubble';
import { AiQuotaSummary } from '../../../../components/ai/ai-quota-summary';
import { AiDisclaimer } from '../../../../components/ai/ai-disclaimer';
import { AiModeSelector } from '../../../../components/ai/ai-mode-selector';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <AiQuotaSummary dailyQuota={detail.dailyQuota} turnCount={detail.turnCount} maxTurns={detail.maxTurns} />
        {detail.academicContext ? (
          <Text style={styles.context}>
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
            <Text style={styles.emptyTitle}>Conversación nueva</Text>
            <Text style={styles.emptyText}>Escribe tu duda para empezar. El Tutor te ayuda a comprender, no reemplaza tu práctica.</Text>
          </View>
        ) : (
          detail.messages.map((message) => (
            <AiMessageBubble key={message.id} message={message} reportState={reportStates[message.id]} onReport={handleReport} />
          ))
        )}

        {sending ? (
          <View style={styles.thinking}>
            <ActivityIndicator size="small" color={tokens.color.accent.default} />
            <Text style={styles.thinkingText}>El Tutor está preparando su respuesta…</Text>
          </View>
        ) : null}
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
          <Text style={sendState.outcome.kind === 'safety_blocked' ? styles.noticeSafetyText : styles.noticeErrorText}>{sendState.outcome.message}</Text>
          {sendState.retryable && pending ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reintentar envío" onPress={() => submit(pending.content)} disabled={sending}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!availability.canSend ? (
        <View style={styles.blockedBox} accessibilityRole="alert">
          <Text style={styles.blockedText}>{availability.message}</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <AiModeSelector value={mode} onChange={setMode} disabled={inputDisabled} />
        <View style={styles.composerRow}>
          <TextInput
            accessibilityLabel="Escribe tu mensaje para el Tutor IA"
            placeholder={availability.canSend ? 'Escribe tu mensaje…' : 'Envío no disponible'}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            onPress={() => submit(draft)}
            disabled={inputDisabled || !draft.trim()}
            style={[styles.sendButton, (inputDisabled || !draft.trim()) && styles.buttonDisabled]}
          >
            {sending ? <ActivityIndicator color={tokens.color.text.onInverse} /> : <Text style={styles.sendButtonText}>Enviar</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    header: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    context: { fontSize: 12, color: t.color.text.secondary },
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
    emptyTitle: { fontSize: 15, fontWeight: '700' as const, color: t.color.text.primary },
    emptyText: { fontSize: 13, color: t.color.text.secondary, lineHeight: 19 },
    thinking: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    thinkingText: { fontSize: 12, color: t.color.text.secondary },
    notice: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
    noticeError: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    noticeErrorText: { fontSize: 13, color: t.color.state.error.text },
    noticeSafety: { backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border },
    noticeSafetyText: { fontSize: 13, color: t.color.state.warning.text },
    retryText: { fontSize: 13, color: t.color.accent.strong, fontWeight: '600' as const },
    blockedBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.color.state.warning.border,
      backgroundColor: t.color.state.warning.background,
      borderRadius: 8,
      padding: 10,
    },
    blockedText: { fontSize: 13, color: t.color.state.warning.text },
    composer: {
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
    },
    composerRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 8 },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.default,
      color: t.color.text.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 15,
    },
    inputDisabled: { backgroundColor: t.color.action.disabledBackground, color: t.color.action.disabledText },
    sendButton: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    sendButtonText: { color: t.color.text.onInverse, fontWeight: '600' as const, fontSize: 14 },
    buttonDisabled: { opacity: 0.5 },
  };
}
