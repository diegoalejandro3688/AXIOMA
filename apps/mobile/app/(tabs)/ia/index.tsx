import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { AiConversationSummaryResponse, AiMeStatusResponse } from '@axioma/contracts';
import { createAiConversation, deleteAiConversation, getAiStatus, listAiConversations } from '../../../lib/api/ai';
import { AiQuotaSummary } from '../../../components/ai/ai-quota-summary';
import { AiDisclaimer } from '../../../components/ai/ai-disclaimer';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Icon, Card, ListRow, Button } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../theme';
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
        <Text variant="heading1" accessibilityRole="header">
          Tutor IA
        </Text>

        {/* Símbolo decorativo del Tutor (nodos + vértice, .md 6.6) -- puramente visual, no sustituye ninguna acción. */}
        <View style={styles.symbolWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="ai" size={64} color={tokens.color.accent.default} />
        </View>

        {header ? <AiQuotaSummary dailyQuota={header.dailyQuota} /> : null}
        {header ? <AiDisclaimer text={header.disclaimer} /> : null}

        {!header && statusState.status === 'loading' ? (
          <Text variant="caption" color="secondary">
            Cargando tu cuota diaria…
          </Text>
        ) : null}
        {!header && statusState.status === 'error' ? (
          <View style={styles.statusErrorBox}>
            <Text variant="bodySmall" color="error">
              {statusState.message}
            </Text>
            <Button label="Reintentar" accessibilityLabel="Reintentar cuota diaria" onPress={() => void loadStatus()} variant="tertiary" size="small" />
          </View>
        ) : null}

        {hasContext ? (
          <View style={styles.contextBanner}>
            <Text variant="caption" color="secondary" style={{ color: tokens.color.accent.strong }}>
              Vas a abrir el Tutor con el contenido de Estudio desde el que llegaste. Solo se envía la referencia de ese contenido.
            </Text>
          </View>
        ) : null}

        <Button
          label={hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}
          accessibilityLabel={hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}
          onPress={handleCreate}
          loading={creating}
          variant="primary"
        />

        {actionError ? (
          <Text variant="bodySmall" color="error">
            {actionError}
          </Text>
        ) : null}

        {conversations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text variant="titleMedium">Todavía no tienes conversaciones</Text>
            <Text variant="bodySmall" color="secondary">
              Inicia una conversación para que el Tutor IA te acompañe. Recuerda que te ayuda a comprender, no reemplaza tu práctica.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text variant="label" color="secondary">
              Tus conversaciones
            </Text>
            {conversations.map((conversation) => (
              <Card key={conversation.conversationId} variant="outlined" style={styles.card}>
                <ListRow
                  title={
                    conversation.academicContext
                      ? `${conversation.academicContext.subjectName} · ${conversation.academicContext.topicName}`
                      : 'Conversación general'
                  }
                  description={
                    conversation.lastMessageAt
                      ? `Última actividad: ${formatDateTime(conversation.lastMessageAt)}`
                      : `Creada: ${formatDateTime(conversation.createdAt)} · sin mensajes`
                  }
                  valueText={`${conversation.turnCount} de ${conversation.maxTurns}`}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/ia/conversation/[conversationId]', params: { conversationId: conversation.conversationId } })
                  }
                  accessibilityLabel="Abrir conversación"
                />

                {pendingDeleteId === conversation.conversationId ? (
                  <View style={styles.confirmRow}>
                    <Text variant="caption" color="secondary">
                      ¿Eliminar esta conversación? No se puede deshacer.
                    </Text>
                    <View style={styles.confirmButtons}>
                      <Button
                        label="Eliminar"
                        accessibilityLabel="Confirmar eliminación"
                        onPress={() => handleDelete(conversation.conversationId)}
                        loading={deletingId === conversation.conversationId}
                        disabled={deletingId === conversation.conversationId}
                        variant="danger"
                        size="small"
                      />
                      <Button
                        label="Cancelar"
                        accessibilityLabel="Cancelar eliminación"
                        onPress={() => setPendingDeleteId(null)}
                        variant="tertiary"
                        size="small"
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Eliminar"
                    accessibilityLabel="Eliminar conversación"
                    onPress={() => setPendingDeleteId(conversation.conversationId)}
                    variant="tertiary"
                    size="small"
                    style={styles.deleteTrigger}
                  />
                )}
              </Card>
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
    content: { gap: spacing.space3, padding: spacing.space5, paddingBottom: spacing.space8 },
    symbolWrap: { alignItems: 'center' as const, paddingVertical: spacing.space2 },
    statusErrorBox: {
      gap: spacing.space2,
      borderWidth: 1,
      borderColor: t.color.state.error.border,
      backgroundColor: t.color.state.error.background,
      borderRadius: 8,
      padding: spacing.space3,
    },
    contextBanner: {
      borderWidth: 1,
      borderColor: t.color.accent.default,
      backgroundColor: t.color.accent.subtleBg,
      borderRadius: 8,
      padding: spacing.space3,
    },
    emptyBox: {
      gap: spacing.space2,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 12,
      padding: spacing.space4,
    },
    list: { gap: spacing.space3 },
    card: { gap: spacing.space2 },
    confirmRow: { gap: spacing.space2, paddingHorizontal: spacing.space4, paddingBottom: spacing.space2 },
    confirmButtons: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    deleteTrigger: { alignSelf: 'flex-start' as const, marginLeft: spacing.space4, marginBottom: spacing.space2 },
  };
}
