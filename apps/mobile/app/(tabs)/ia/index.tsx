import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { AiConversationSummaryResponse, AiMeStatusResponse } from '@axioma/contracts';
import { createAiConversation, deleteAiConversation, getAiStatus, listAiConversations } from '../../../lib/api/ai';
import { AiQuotaSummary } from '../../../components/ai/ai-quota-summary';
import { AiDisclaimer } from '../../../components/ai/ai-disclaimer';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; conversations: AiConversationSummaryResponse[] };

/**
 * Estado del encabezado (cuota + disclaimer) para el caso "historial vacío".
 * `idle` = no hace falta pedirlo porque el propio historial ya trae ambos
 * valores frescos del servidor (ver `quotaSource`). NUNCA existe un estado
 * "valor por defecto": si el fetch falla, se muestra el error, no un
 * placeholder inventado.
 */
type StatusState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: AiMeStatusResponse };

/**
 * Hub del Tutor IA -- LEF Bloque VI, Incremento 8
 * (docs/adr/LEF-BLOCK-VI-DEFINITION.md §28). Reemplaza el placeholder
 * `ia.tsx` (`ComingSoonPlaceholder`).
 *
 * Todo lo que se muestra viene del backend ya cerrado (Incrementos 1-7):
 * historial propio (`GET /ai/me/conversations`), cuota diaria y turnos ya
 * resueltos por el servidor, y el disclaimer tal cual lo devuelve el
 * contrato. Mobile NO reimplementa cuotas, límites de turnos, idempotencia,
 * pedagogía, seguridad, contexto académico, retención ni ownership.
 *
 * Acceso contextual desde Estudio (Incremento 4, punto de entrada 2): esta
 * pantalla acepta `contextQuestionVersionId`/`contextCurriculumTopicId` como
 * parámetros de ruta y los reenvía TAL CUAL al crear la conversación --
 * únicamente identificadores, nunca enunciado, alternativa elegida,
 * corrección, explicación ni progreso fabricados por el cliente. La creación
 * nunca ocurre sola al montar: siempre requiere la acción explícita del
 * estudiante sobre el botón.
 */
export default function IaHubScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const { contextQuestionVersionId, contextCurriculumTopicId } = useLocalSearchParams<{
    contextQuestionVersionId?: string;
    contextCurriculumTopicId?: string;
  }>();

  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [statusState, setStatusState] = useState<StatusState>({ status: 'idle' });
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * `GET /ai/me/status` -- SOLO para el caso "historial vacío". Es una
   * lectura pura del backend: no crea conversación, no consume cuota, no
   * invoca al proveedor.
   */
  const loadStatus = useCallback(async () => {
    setStatusState({ status: 'loading' });
    const result = await getAiStatus();
    setStatusState(result.ok ? { status: 'ready', data: result.data } : { status: 'error', message: result.message });
  }, []);

  const load = useCallback(async () => {
    const result = await listAiConversations();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      setStatusState({ status: 'idle' });
      return;
    }
    const { conversations } = result.data;
    setState({ status: 'ready', conversations });
    // Con conversaciones, `dailyQuota`/`disclaimer` YA vienen frescos en la
    // respuesta canónica del historial -- pedir status además sería una
    // petición redundante contra la misma fuente de verdad.
    if (conversations.length > 0) {
      setStatusState({ status: 'idle' });
      return;
    }
    await loadStatus();
  }, [loadStatus]);

  // Carga inicial Y recarga al volver desde una conversación: el historial y
  // la cuota se releen SIEMPRE del servidor -- nunca se conserva un estado
  // local que pudiera divergir (invariante de I8: "sin estado local que pueda
  // divergir silenciosamente del backend").
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleCreate() {
    if (creating) return; // anti doble-toque: nunca dos conversaciones por un toque repetido.
    setActionError(null);
    setCreating(true);
    const result = await createAiConversation({
      contextQuestionVersionId: contextQuestionVersionId || undefined,
      contextCurriculumTopicId: contextCurriculumTopicId || undefined,
    });
    setCreating(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    router.push({ pathname: '/(tabs)/ia/conversation/[conversationId]', params: { conversationId: result.data.conversationId } });
  }

  async function handleDelete(conversationId: string) {
    if (deletingId) return; // anti doble-toque.
    setActionError(null);
    setDeletingId(conversationId);
    const result = await deleteAiConversation(conversationId);
    setDeletingId(null);
    setPendingDeleteId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    // Reconciliación con el servidor tras el borrado (hard delete, sin
    // papelera) -- nunca se elimina la fila solo en memoria.
    await load();
  }

  if (state.status === 'loading') return <LoadingState message="Cargando tus conversaciones…" />;
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

  const { conversations } = state;
  // `dailyQuota`/`disclaimer` son idénticos en todas las filas (el servidor
  // los resuelve una vez por cuenta) -- se leen de la primera disponible,
  // nunca se recalculan ni se rellenan con valores por defecto del cliente.
  const quotaSource = conversations[0] ?? null;
  // Sin conversaciones no hay ninguna respuesta canónica de la que leerlos:
  // se usan los del endpoint de estado (`GET /ai/me/status`), también del
  // servidor. Si ninguno de los dos está disponible, `header` es null y la
  // pantalla muestra carga/error -- jamás una cuota ni un disclaimer
  // fabricados en el cliente.
  const header = quotaSource
    ? { dailyQuota: quotaSource.dailyQuota, disclaimer: quotaSource.disclaimer }
    : statusState.status === 'ready'
      ? { dailyQuota: statusState.data.dailyQuota, disclaimer: statusState.data.disclaimer }
      : null;
  const hasContext = !!(contextQuestionVersionId || contextCurriculumTopicId);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} accessibilityRole="header">
          Tutor IA
        </Text>

        {header ? <AiQuotaSummary dailyQuota={header.dailyQuota} /> : null}
        {header ? <AiDisclaimer text={header.disclaimer} /> : null}

        {!header && statusState.status === 'loading' ? <Text style={styles.statusHint}>Cargando tu cuota diaria…</Text> : null}
        {!header && statusState.status === 'error' ? (
          <View style={styles.statusErrorBox}>
            <Text style={styles.error}>{statusState.message}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Reintentar cuota diaria" onPress={() => void loadStatus()}>
              <Text style={styles.cancelText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {hasContext ? (
          <View style={styles.contextBanner}>
            <Text style={styles.contextBannerText}>
              Vas a abrir el Tutor con el contenido de Estudio desde el que llegaste. Solo se envía la referencia de ese contenido.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}
          onPress={handleCreate}
          disabled={creating}
          style={[styles.primaryButton, creating && styles.buttonDisabled]}
        >
          {creating ? (
            <ActivityIndicator color={tokens.color.text.onInverse} />
          ) : (
            <Text style={styles.primaryButtonText}>{hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}</Text>
          )}
        </Pressable>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {conversations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Todavía no tienes conversaciones</Text>
            <Text style={styles.emptyText}>
              Inicia una conversación para que el Tutor IA te acompañe. Recuerda que te ayuda a comprender, no reemplaza tu práctica.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionTitle}>Tus conversaciones</Text>
            {conversations.map((conversation) => (
              <View key={conversation.conversationId} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir conversación"
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/ia/conversation/[conversationId]', params: { conversationId: conversation.conversationId } })
                  }
                  style={styles.cardBody}
                >
                  <Text style={styles.cardTitle}>
                    {conversation.academicContext
                      ? `${conversation.academicContext.subjectName} · ${conversation.academicContext.topicName}`
                      : 'Conversación general'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {conversation.lastMessageAt
                      ? `Última actividad: ${formatDateTime(conversation.lastMessageAt)}`
                      : `Creada: ${formatDateTime(conversation.createdAt)} · sin mensajes`}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Turnos: {conversation.turnCount} de {conversation.maxTurns}
                  </Text>
                </Pressable>

                {pendingDeleteId === conversation.conversationId ? (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>¿Eliminar esta conversación? No se puede deshacer.</Text>
                    <View style={styles.confirmButtons}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirmar eliminación"
                        onPress={() => handleDelete(conversation.conversationId)}
                        disabled={deletingId === conversation.conversationId}
                        style={[styles.dangerButton, deletingId === conversation.conversationId && styles.buttonDisabled]}
                      >
                        {deletingId === conversation.conversationId ? <ActivityIndicator size="small" /> : <Text style={styles.dangerButtonText}>Eliminar</Text>}
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar eliminación" onPress={() => setPendingDeleteId(null)}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar conversación"
                    onPress={() => setPendingDeleteId(conversation.conversationId)}
                    style={styles.deleteTrigger}
                  >
                    <Text style={styles.deleteTriggerText}>Eliminar</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Formato local legible -- nunca reinterpreta la semántica del instante recibido del servidor. */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { gap: 12, padding: 20, paddingBottom: 32 },
    pageTitle: { fontSize: 24, fontWeight: '700' as const, color: t.color.text.primary },
    sectionTitle: { fontSize: 13, color: t.color.text.secondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    contextBanner: {
      borderWidth: 1,
      borderColor: t.color.accent.default,
      backgroundColor: t.color.accent.subtleBg,
      borderRadius: 8,
      padding: 10,
    },
    contextBannerText: { fontSize: 12, color: t.color.accent.strong },
    primaryButton: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    primaryButtonText: { color: t.color.text.onInverse, fontWeight: '600' as const, fontSize: 14 },
    buttonDisabled: { opacity: 0.5 },
    error: { fontSize: 13, color: t.color.state.error.text },
    statusHint: { fontSize: 12, color: t.color.text.secondary },
    statusErrorBox: {
      gap: 6,
      borderWidth: 1,
      borderColor: t.color.state.error.border,
      backgroundColor: t.color.state.error.background,
      borderRadius: 8,
      padding: 10,
    },
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
    list: { gap: 10 },
    card: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    cardBody: { gap: 4 },
    cardTitle: { fontSize: 15, fontWeight: '600' as const, color: t.color.text.primary },
    cardMeta: { fontSize: 12, color: t.color.text.secondary },
    deleteTrigger: { alignSelf: 'flex-start' as const },
    deleteTriggerText: { fontSize: 12, color: t.color.state.error.text },
    confirmRow: { gap: 8 },
    confirmText: { fontSize: 12, color: t.color.text.secondary },
    confirmButtons: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
    dangerButton: {
      borderWidth: 1,
      borderColor: t.color.state.error.border,
      backgroundColor: t.color.state.error.background,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    dangerButtonText: { fontSize: 13, color: t.color.state.error.text, fontWeight: '600' as const },
    cancelText: { fontSize: 13, color: t.color.accent.strong },
  };
}
