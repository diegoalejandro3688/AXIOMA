import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { AiMessageResponse, AiResponseReportType } from '@axioma/contracts';
import { REPORT_CATEGORY_OPTIONS, REPORT_SENT_MESSAGE } from '../../lib/ai/report-categories';
import { describeAssistanceMode } from '../../lib/ai/assistance-modes';
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
      <View style={[styles.bubble, isAssistant ? styles.bubbleAssistant : styles.bubbleUser]}>
        <Text style={styles.author}>{isAssistant ? 'Tutor IA' : 'Tú'}</Text>
        <Text style={[styles.content, isAssistant ? styles.contentAssistant : styles.contentUser]}>{message.content}</Text>
        {!isAssistant && message.requestedMode ? <Text style={styles.mode}>Modo: {describeAssistanceMode(message.requestedMode)}</Text> : null}
      </View>

      {isAssistant && onReport ? (
        <View style={styles.reportArea}>
          {state.status === 'sent' ? (
            <Text style={styles.reportSent}>{REPORT_SENT_MESSAGE}</Text>
          ) : state.status === 'sending' ? (
            <ActivityIndicator size="small" />
          ) : pickerOpen ? (
            <View style={styles.reportPicker}>
              <Text style={styles.reportPickerTitle}>¿Qué problema tiene esta respuesta?</Text>
              <View style={styles.reportOptions}>
                {REPORT_CATEGORY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Reportar como ${option.label}`}
                    onPress={() => handlePick(option.value)}
                    style={styles.reportOption}
                  >
                    <Text style={styles.reportOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancelar reporte" onPress={() => setPickerOpen(false)}>
                <Text style={styles.reportCancel}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Reportar esta respuesta" onPress={() => setPickerOpen(true)}>
              <Text style={styles.reportTrigger}>Reportar respuesta</Text>
            </Pressable>
          )}
          {state.error ? <Text style={styles.reportError}>{state.error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    row: { gap: 4, maxWidth: '92%' as const },
    rowAssistant: { alignSelf: 'flex-start' as const },
    rowUser: { alignSelf: 'flex-end' as const },
    bubble: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
    bubbleAssistant: { backgroundColor: t.color.background.surface, borderColor: t.color.border.default },
    bubbleUser: { backgroundColor: t.color.accent.subtleBg, borderColor: t.color.accent.default },
    author: { fontSize: 11, color: t.color.text.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    content: { fontSize: 15, lineHeight: 21 },
    contentAssistant: { color: t.color.text.primary },
    contentUser: { color: t.color.text.primary },
    mode: { fontSize: 11, color: t.color.text.muted, fontStyle: 'italic' as const },
    reportArea: { gap: 4 },
    reportTrigger: { fontSize: 12, color: t.color.text.muted, textDecorationLine: 'underline' as const },
    reportSent: { fontSize: 12, color: t.color.state.success.text },
    reportError: { fontSize: 12, color: t.color.state.error.text },
    reportPicker: {
      gap: 8,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: 10,
      padding: 10,
    },
    reportPickerTitle: { fontSize: 12, color: t.color.text.secondary },
    reportOptions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    reportOption: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    reportOptionText: { fontSize: 12, color: t.color.text.primary },
    reportCancel: { fontSize: 12, color: t.color.accent.strong },
  };
}
