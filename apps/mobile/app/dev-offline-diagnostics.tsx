import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { getOutboxRepository } from '../lib/offline/database';
import type { OutboxOperation } from '../lib/offline/outbox-repository';

/**
 * Pantalla de diagnóstico SOLO-DEV -- ver ADR-0011. `__DEV__` es un global
 * estándar de React Native: `true` en desarrollo, `false` en cualquier
 * build de producción/release -- en producción esta pantalla nunca
 * ejecuta ninguna operación sobre la base local, solo redirige.
 *
 * No está enlazada desde ninguna pantalla de producto (Login, Tabs) --
 * accesible solo escribiendo la URL directamente durante desarrollo,
 * mismo criterio que los endpoints /platform/_internal/diagnostics del
 * backend (ADR-0007). Los payloads de prueba son datos inertes, nunca
 * PII/tokens/secretos.
 */
export default function OfflineDiagnosticsScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <OfflineDiagnosticsContent />;
}

function OfflineDiagnosticsContent() {
  const [operations, setOperations] = useState<OutboxOperation[]>([]);
  const [lastEnqueuedId, setLastEnqueuedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const repo = await getOutboxRepository();
    setOperations(await repo.listPending());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = async () => {
    const repo = await getOutboxRepository();
    const { id } = await repo.enqueue({
      operationType: 'diagnostic_note_created',
      aggregateType: 'diagnostic',
      aggregateId: 'diagnostic-fixture',
      payload: { note: 'diagnóstico de desarrollo', createdAtMillis: Date.now() },
    });
    setLastEnqueuedId(id);
    await refresh();
  };

  const markLastSynced = async () => {
    if (!lastEnqueuedId) return;
    const repo = await getOutboxRepository();
    await repo.markSynced(lastEnqueuedId);
    await refresh();
  };

  const markLastFailed = async () => {
    if (!lastEnqueuedId) return;
    const repo = await getOutboxRepository();
    await repo.markFailed(lastEnqueuedId, 'Fallo simulado desde la pantalla de diagnóstico.');
    await refresh();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Diagnóstico: Offline Outbox (solo dev)
      </Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={enqueue}>
          <Text style={styles.buttonText}>Encolar operación de prueba</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Refrescar pendientes</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={markLastSynced}>
          <Text style={styles.buttonText}>Marcar última sincronizada</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={markLastFailed}>
          <Text style={styles.buttonText}>Marcar última fallida</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Pendientes ({operations.length}):</Text>
      <FlatList
        data={operations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.id.slice(0, 8)}… — {item.syncStatus} — reintentos: {item.retryCount}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  item: { fontSize: 12, color: '#333', paddingVertical: 2 },
});
