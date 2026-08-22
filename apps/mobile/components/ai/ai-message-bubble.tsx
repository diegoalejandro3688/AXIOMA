import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { AiMessageResponse, AiResponseReportType } from '@axioma/contracts';
import { REPORT_CATEGORY_OPTIONS, REPORT_SENT_MESSAGE } from '../../lib/ai/report-categories';
import { describeAssistanceMode } from '../../lib/ai/assistance-modes';
import { AiTutorMark } from './ai-tutor-mark';
import { Text } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

export type MessageReportState = { status: 'idle' | 'sending' | 'sent'; error?: string | null };

/**
 * Un mensaje de la conversación. El reporte (Incremento 6, PRD AI-015) SOLO
 * existe para mensajes `ASSISTANT`: para un mensaje `USER` este componente ni
 * siquiera renderiza el control (garantía estructural, no una comprobación
 * dentro del handler) -- reportar el propio mensaje del estudiante no tiene
 * sentido de producto y el backend lo rechaza (400).
 *
 * Anti doble-toque: mientras `reportState.status === 'sending'` los botones
 * de categoría quedan deshabilitados y el handler retorna de inmediato;
 * enviado el reporte, el panel se cierra y se muestra una confirmación
 * simple. Mobile NUNCA inventa un estado de moderación ("en revisión",
 * "eliminada"): el backend no devuelve ninguno.
 */
export function AiMessageBubble({
  message,
  reportState,
  onReport,
}: {
  message: AiMessageResponse;
  reportState?: MessageReportState;
  onReport?: (messageId: string, reportType: AiResponseReportType) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isAssistant = message.role === 'ASSISTANT';
  const state = reportState ?? { status: 'idle' as const };

  function handlePick(reportType: AiResponseReportType) {
    if (state.status === 'sending' || state.status === 'sent') return; // anti doble-toque.
    setPickerOpen(false);
    onReport?.(message.id, reportType);
  }

  return (
    <View style={[styles.row, isAssistant ? styles.rowAssistant : styles.rowUser]}>
      {isAssistant ? (
        // AI-2A -- respuesta del Tutor SIN card/burbuja: identidad discreta
        // (símbolo pequeño real de AI-1J + "Tutor IA", mismo copy real que
        // ya existía -- nunca "Tutor Zetrynd") seguida del contenido
        // directamente sobre el fondo, a todo el ancho disponible.
        <View style={styles.assistantContent}>
          <View style={styles.identityRow}>
            <AiTutorMark size={18} />
            <Text variant="caption" color="muted" style={styles.author}>
              Tutor IA
            </Text>
          </View>
          <Text variant="body" style={styles.assistantText}>
            {message.content}
          </Text>
        </View>
      ) : (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text variant="caption" color="muted" style={styles.author}>
            Tú
          </Text>
          <Text variant="body" style={styles.content}>
            {message.content}
          </Text>
          {message.requestedMode ? (
            <Text variant="caption" color="muted" style={styles.mode}>
              Modo: {describeAssistanceMode(message.requestedMode)}
            </Text>
          ) : null}
        </View>
      )}

      {isAssistant && onReport ? (
        <View style={styles.reportArea}>
          {state.status === 'sent' ? (
            <Text variant="caption" style={styles.reportSent}>
              {REPORT_SENT_MESSAGE}
            </Text>
          ) : state.status === 'sending' ? (
            <ActivityIndicator size="small" />
          ) : pickerOpen ? (
            <View style={styles.reportPicker}>
              <Text variant="caption" color="secondary">
                ¿Qué problema tiene esta respuesta?
              </Text>
              <View style={styles.reportOptions}>
                {REPORT_CATEGORY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Reportar como ${option.label}`}
                    onPress={() => handlePick(option.value)}
                    style={styles.reportOption}
                  >
                    <Text variant="caption">{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancelar reporte" onPress={() => setPickerOpen(false)}>
                <Text variant="caption" style={styles.reportCancel}>
                  Cancelar
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Reportar esta respuesta" onPress={() => setPickerOpen(true)}>
              <Text variant="caption" color="muted" style={styles.reportTrigger}>
                Reportar respuesta
              </Text>
            </Pressable>
          )}
          {state.error ? (
            <Text variant="caption" color="error">
              {state.error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    row: { gap: 4 },
    // AI-2A -- la respuesta del Tutor usa prácticamente todo el ancho
    // disponible (sin card exterior); solo la burbuja del usuario conserva
    // un ancho máximo razonable.
    rowAssistant: { alignSelf: 'stretch' as const, width: '100%' as const },
    rowUser: { alignSelf: 'flex-end' as const, maxWidth: '85%' as const },
    assistantContent: { gap: 6 },
    identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    assistantText: { color: t.color.text.primary },
    bubble: { borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
    bubbleUser: { backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default },
    author: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    content: { color: t.color.text.primary },
    mode: { fontStyle: 'italic' as const },
    reportArea: { gap: 4 },
    reportTrigger: { textDecorationLine: 'underline' as const },
    reportSent: { color: t.color.state.success.text },
    reportPicker: {
      gap: 8,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 10,
      padding: 10,
    },
    reportOptions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    reportOption: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    reportCancel: { color: t.color.accent.strong },
  };
}
