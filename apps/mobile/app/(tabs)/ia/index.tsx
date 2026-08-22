import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import type { AiAssistanceMode, AiConversationSummaryResponse, AiMeStatusResponse } from '@axioma/contracts';
import { createAiConversation, deleteAiConversation, getAiStatus, listAiConversations, sendAiMessage } from '../../../lib/api/ai';
import { mapSendMessageResult, resolveSendOperationId, type PendingSendAttempt } from '../../../lib/ai/send-outcome';
import { resolveSendAvailability } from '../../../lib/ai/conversation-availability';
import { ASSISTANCE_MODE_OPTIONS, DEFAULT_ASSISTANCE_MODE, describeAssistanceMode } from '../../../lib/ai/assistance-modes';
import { AiQuotaSummary } from '../../../components/ai/ai-quota-summary';
import { AiDisclaimer } from '../../../components/ai/ai-disclaimer';
import { AiTutorMark } from '../../../components/ai/ai-tutor-mark';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Icon, IconButton, Card, ListRow, Button, Dialog } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing, radii } from '../../../theme';
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
  const insets = useSafeAreaInsets();
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
  // AI-1 -- historial fuera del contenido principal (decisión de producto
  // aprobada): estado local simple, sin ruta nueva, reutilizando `Dialog`.
  const [historyOpen, setHistoryOpen] = useState(false);

  // AI-1B -- composer real en Home. Estado 100% local a esta pantalla, sin
  // segundo pipeline: reutiliza los mismos tipos/helpers ya usados por
  // `conversation/[conversationId].tsx` (`PendingSendAttempt`,
  // `resolveSendOperationId`, `mapSendMessageResult`).
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<AiAssistanceMode | null>(DEFAULT_ASSISTANCE_MODE);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [homeSending, setHomeSending] = useState(false);
  const [homeSendError, setHomeSendError] = useState<string | null>(null);
  const [pendingHomeSend, setPendingHomeSend] = useState<PendingSendAttempt | null>(null);

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

  // AI-1B -- disponibilidad de envío desde Home, MISMO helper canónico que
  // Conversación (`resolveSendAvailability`). Una conversación desde Home
  // todavía no existe, así que `turnCount` es siempre 0 (recién creada) --
  // eso hace que la rama de límite de turnos NUNCA pueda dispararse aquí
  // (0 >= maxTurns es imposible con un `maxTurns` real, siempre positivo),
  // sin necesitar conocer el `maxTurns` real de una conversación que aún no
  // existe. El único motivo de bloqueo posible antes de crear es la cuota
  // diaria real -- exactamente la misma regla que ya usa Conversación.
  const homeAvailability = header ? resolveSendAvailability({ dailyQuota: header.dailyQuota, turnCount: 0, maxTurns: 1 }) : null;
  const composerDisabled = homeSending || (homeAvailability !== null && !homeAvailability.canSend);

  /**
   * AI-1B -- secuencia ESTRICTA create -> send -> navigate, reutilizando
   * EXACTAMENTE el pipeline real (`createAiConversation`, `sendAiMessage`,
   * `mapSendMessageResult`, `resolveSendOperationId`) -- cero pipeline
   * paralelo, cero optimismo: solo se navega tras el resultado canónico OK
   * de `sendAiMessage`.
   */
  async function handleSend() {
    if (homeSending) return; // anti doble-toque: nunca dos secuencias create->send a la vez.
    const trimmed = draft.trim();
    if (!trimmed) return; // sin contenido -> ni crea conversación ni envía nada.
    if (homeAvailability && !homeAvailability.canSend) return; // cuota agotada -- misma regla canónica que Conversación.

    setHomeSendError(null);
    setHomeSending(true);

    const createResult = await createAiConversation({
      contextQuestionVersionId: contextQuestionVersionId || undefined,
      contextCurriculumTopicId: contextCurriculumTopicId || undefined,
    });
    if (!createResult.ok) {
      setHomeSending(false);
      setHomeSendError('No se pudo iniciar la conversación. Inténtalo de nuevo.');
      return; // NUNCA se llama a sendAiMessage si la creación falló.
    }

    const { conversationId } = createResult.data;
    // Reintento de la MISMA operación (mismo texto pendiente) -> mismo
    // operationId, igual criterio que Conversación -- si el usuario vuelve a
    // pulsar enviar tras un fallo sin cambiar el texto, no se duplica el
    // efecto en el servidor.
    const operationId = resolveSendOperationId(pendingHomeSend, trimmed, randomUUID);
    setPendingHomeSend({ content: trimmed, operationId });

    const outcome = mapSendMessageResult(await sendAiMessage(conversationId, { content: trimmed, operationId, requestedMode: mode }));
    setHomeSending(false);

    if (outcome.kind === 'ok') {
      // Backend es la única autoridad: solo se navega tras la confirmación
      // canónica del envío, nunca solo porque la creación funcionó.
      setPendingHomeSend(null);
      setDraft('');
      router.push({ pathname: '/(tabs)/ia/conversation/[conversationId]', params: { conversationId } });
      return;
    }

    // La conversación YA existe en el servidor (creación exitosa) pero el
    // primer mensaje falló -- NO se intenta un rollback/delete automático
    // (fuera de alcance de AI-1B, ver auditoría). El texto se conserva en el
    // composer para que el estudiante pueda reintentar o abrir el historial.
    setHomeSendError('No se pudo enviar el mensaje. Puedes abrir la conversación e intentarlo de nuevo.');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/*
        AI-1 -- header custom rediseñado: acceso ☰ al historial (antes vivía
        inline en el contenido principal) + identidad del Tutor. Reemplaza el
        `heading1` que antes encabezaba el scroll -- misma jerarquía de
        título, ahora fija arriba en vez de scrollear con el contenido.
      */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.space3 }]}>
        <IconButton name="menu" accessibilityLabel="Ver tus conversaciones" onPress={() => setHistoryOpen(true)} color="secondary" />
        <View style={styles.headerTitleBlock}>
          <Text variant="titleLarge" weight="bold" accessibilityRole="header">
            Tutor IA
          </Text>
          <Text variant="caption" color="secondary">
            Tu tutor personal de Zetrynd
          </Text>
        </View>
        {/* Espaciador simétrico al IconButton -- centra el bloque de título. */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/*
          AI-1D -- identidad visual definitiva: `AiTutorMark` (símbolo oficial
          + red circular sutil, componente local dedicado, ver
          `components/ai/ai-tutor-mark.tsx`) reemplaza el `Icon name="ai"`
          suelto. El heading baja un nivel (`heading1` -> `heading2`) para
          que el símbolo se reconozca primero y la pregunta no compita en
          tamaño con él -- mismo copy exacto, mismo `variant` del sistema
          tipográfico, sin fontSize arbitrario.
        */}
        <View style={styles.hero}>
          <AiTutorMark size={104} />
          <Text variant="heading2" style={styles.heroQuestion} accessibilityRole="header">
            ¿Qué quieres aprender hoy?
          </Text>
          <Text variant="body" color="secondary" style={styles.heroSubtitle}>
            Resuelve dudas y aprende paso a paso.
          </Text>
        </View>

        {hasContext ? (
          <View style={styles.contextBanner}>
            <Text variant="caption" color="secondary" style={{ color: tokens.color.accent.strong }}>
              Vas a abrir el Tutor con el contenido de Estudio desde el que llegaste. Solo se envía la referencia de ese contenido.
            </Text>
          </View>
        ) : null}

        {/*
          AI-1B -- composer real: sustituye el CTA "Nueva conversación" como
          vía PRINCIPAL de Home (decisión de Product Owner). El botón sigue
          existiendo como vía SECUNDARIA dentro del Dialog de historial (sin
          tocar `handleCreate()`/`creating`, ver más abajo). `handleSend()`
          reutiliza el pipeline real (create -> send -> navigate), nunca un
          segundo sistema de mensajes.
        */}
        <View style={styles.composerCard}>
          <TextInput
            accessibilityLabel="Pregúntale al tutor"
            placeholder="Pregúntale al tutor…"
            placeholderTextColor={tokens.color.text.muted}
            selectionColor={tokens.color.accent.default}
            cursorColor={tokens.color.accent.default}
            value={draft}
            onChangeText={setDraft}
            editable={!composerDisabled}
            multiline
            maxLength={4000}
            style={styles.composerInput}
          />
          <View style={styles.composerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Modo de asistencia: ${describeAssistanceMode(mode)}`}
              disabled={composerDisabled}
              onPress={() => setModePickerOpen(true)}
              style={styles.modeTrigger}
            >
              <Text variant="label" color="secondary">
                {describeAssistanceMode(mode)}
              </Text>
              <Icon name="chevron-down" size={16} color="muted" />
            </Pressable>
            <IconButton
              name="chevron-up"
              accessibilityLabel="Enviar mensaje al Tutor"
              onPress={handleSend}
              disabled={composerDisabled || !draft.trim()}
              color="onAccent"
              size={20}
              style={[
                styles.sendButton,
                { backgroundColor: composerDisabled || !draft.trim() ? tokens.color.action.disabledBackground : tokens.color.accent.default },
              ]}
            />
          </View>
        </View>

        {homeAvailability && !homeAvailability.canSend ? (
          <Text variant="bodySmall" color="error">
            {homeAvailability.message}
          </Text>
        ) : null}

        {homeSendError ? (
          <Text variant="bodySmall" color="error">
            {homeSendError}
          </Text>
        ) : null}

        {actionError ? (
          <Text variant="bodySmall" color="error">
            {actionError}
          </Text>
        ) : null}

        {/*
          AI-1 -- cuota y disclaimer bajan de jerarquía (información
          administrativa, no protagonista), pero preservan EXACTAMENTE el
          mismo JSX/dato real que exige `verify-ai-mobile-gate.ts` -- solo
          se envuelven en un contenedor más discreto al final de la Home.
        */}
        <View style={styles.footerInfo}>
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
        </View>
      </ScrollView>

      {/*
        AI-1 -- historial detrás de ☰ (decisión de producto aprobada): mismo
        `Dialog` genérico ya usado en Perfil (PROFILE-5B), sin ruta nueva,
        sin dependencia nueva. Todo el JSX/lógica que exige el gate
        (creación, lista, metadata real, confirmación de borrado,
        navegación, estado vacío) sigue viviendo textualmente en este mismo
        archivo -- solo cambia de posición visual.
      */}
      <Dialog visible={historyOpen} onRequestClose={() => setHistoryOpen(false)}>
        {/*
          AI-1A -- affordance explícita de cierre (X), además del cierre ya
          existente por `onRequestClose` (botón atrás de Android/backdrop).
          Reemplaza el `title` plano de `Dialog` por un header propio con el
          mismo texto ("Conversaciones") + `IconButton` reutilizando el icono
          `close` ya existente (mismo usado en `recurso.tsx`/`ejercicio.tsx`)
          -- ningún icono nuevo, ningún segundo controlador: llama
          exactamente a `setHistoryOpen(false)`, nunca navega ni toca datos.
        */}
        <View style={styles.historyHeader}>
          <Text variant="heading3" accessibilityRole="header">
            Conversaciones
          </Text>
          <IconButton name="close" accessibilityLabel="Cerrar historial" onPress={() => setHistoryOpen(false)} color="secondary" />
        </View>

        <Button
          label={hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}
          accessibilityLabel={hasContext ? 'Nueva conversación sobre este contenido' : 'Nueva conversación'}
          onPress={handleCreate}
          loading={creating}
          variant="secondary"
        />

        {conversations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text variant="titleMedium">Todavía no tienes conversaciones</Text>
            <Text variant="bodySmall" color="secondary">
              Inicia una conversación para que el Tutor IA te acompañe. Recuerda que te ayuda a comprender, no reemplaza tu práctica.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.historyList}>
            <View style={styles.list}>
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
                    onPress={() => {
                      setHistoryOpen(false);
                      router.push({ pathname: '/(tabs)/ia/conversation/[conversationId]', params: { conversationId: conversation.conversationId } });
                    }}
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
          </ScrollView>
        )}
      </Dialog>

      {/*
        AI-1B -- selector compacto de modo. No existe Menu/Popover/Dropdown
        en el proyecto (ver auditoría) -- mismo `Dialog` genérico ya usado
        para el historial, con las 5 opciones REALES/canónicas
        (`ASSISTANCE_MODE_OPTIONS`, sin duplicar labels a mano). Nunca
        modifica `assistance-modes.ts` ni `ai-mode-selector.tsx`.
      */}
      <Dialog visible={modePickerOpen} title="Cómo quieres que te ayude" onRequestClose={() => setModePickerOpen(false)}>
        <View style={styles.modeOptions}>
          {ASSISTANCE_MODE_OPTIONS.map((option) => {
            const isSelected = option.value === mode;
            return (
              <Pressable
                key={option.value ?? 'AUTO'}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Modo ${option.label}`}
                onPress={() => {
                  setMode(option.value);
                  setModePickerOpen(false);
                }}
                style={[styles.modeOptionRow, isSelected && styles.modeOptionRowSelected]}
              >
                <View style={styles.modeOptionText}>
                  <Text variant="titleMedium" weight={isSelected ? 'semibold' : 'regular'}>
                    {option.label}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {option.description}
                  </Text>
                </View>
                {isSelected ? <Icon name="check" size={18} color="accent" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </KeyboardAvoidingView>
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
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space2,
      paddingHorizontal: spacing.space4,
      paddingBottom: spacing.space3,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
    },
    headerTitleBlock: { flex: 1, alignItems: 'center' as const },
    headerSpacer: { width: 44 },
    content: { flexGrow: 1, gap: spacing.space5, padding: spacing.space5, paddingBottom: spacing.space8, justifyContent: 'center' as const },
    // AI-1C -- `paddingVertical` reducido en un paso (`space6` -> `space5`):
    // el subtítulo pasó de 2 líneas a 1, ese aire ya no hace falta. Sin
    // reorganizar el resto de la jerarquía (mismo `gap`, mismo orden).
    // AI-1D -- `gap` reducido un paso (`space3` -> `space2`): `AiTutorMark`
    // ya incluye su propio aire visual (la red se extiende más allá del
    // símbolo), así que el hero no necesita tanto espacio adicional entre el
    // símbolo y el título para sentirse equilibrado.
    hero: { alignItems: 'center' as const, gap: spacing.space2, paddingVertical: spacing.space5 },
    heroQuestion: { textAlign: 'center' as const },
    heroSubtitle: { textAlign: 'center' as const, maxWidth: 320 },
    // AI-1B -- composer real: superficie clara, borde sutil, radio del
    // design system (`radii.large`), sin sombra. TextInput sin borde
    // interno propio -- la superficie de la card ya lo aporta.
    composerCard: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: radii.large,
      padding: spacing.space4,
      gap: spacing.space3,
    },
    composerInput: {
      minHeight: 44,
      maxHeight: 120,
      color: t.color.text.primary,
      fontSize: 16,
      padding: 0,
    },
    composerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    modeTrigger: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingVertical: spacing.space1,
      paddingHorizontal: spacing.space2,
      borderRadius: radii.full,
      backgroundColor: t.color.background.default,
    },
    sendButton: { width: 40, height: 40, minWidth: 40, minHeight: 40 },
    modeOptions: { gap: spacing.space1 },
    modeOptionRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.space2,
      paddingVertical: spacing.space3,
      paddingHorizontal: spacing.space2,
      borderRadius: radii.medium,
    },
    modeOptionRowSelected: { backgroundColor: t.color.accent.subtleBg },
    modeOptionText: { flex: 1, gap: 2 },
    footerInfo: { gap: spacing.space2, marginTop: spacing.space4, opacity: 0.7 },
    historyHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    historyList: { maxHeight: 360 },
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
