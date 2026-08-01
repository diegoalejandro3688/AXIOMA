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
 *
 * Corrección 1 (checklist manual de Android, Architecture Review 1.0): la
 * versión original recordaba el id de la última operación en estado de
 * React (`useState`) y `listPending()` solo mostraba filas `PENDING`. Tras
 * reiniciar la app ese estado se pierde. Ahora la "última operación" se
 * consulta directamente de SQLite (`getMostRecent()`, sin filtrar por
 * estado) en cada refresco.
 *
 * Corrección 2 (mismo checklist): se reportó que, tras pulsar solo "Marcar
 * última fallida", el estado final quedaba en SYNCED con retryCount=1.
 * `markFailed()` deja `retryCount` y `syncStatus='FAILED'` en el MISMO
 * UPDATE atómico (probado por el gate automatizado) -- ese resultado
 * combinado (retryCount incrementado + SYNCED) solo es posible si
 * `markSynced()` corrió DESPUÉS sobre la misma fila (no toca retryCount).
 * Se agrega una guarda `busy` (deshabilita los 4 botones mientras hay una
 * operación en curso, evitando cualquier invocación superpuesta) y un
 * registro visible de las últimas acciones ejecutadas, para poder ver con
 * evidencia si eso es lo que está pasando en el próximo intento.
 */
export default function OfflineDiagnosticsScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <OfflineDiagnosticsContent />;
}

interface LogEntry {
  timestamp: string;
  action: string;
}

function OfflineDiagnosticsContent() {
  const [pending, setPending] = useState<OutboxOperation[]>([]);
  const [mostRecent, setMostRecent] = useState<OutboxOperation | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const appendLog = useCallback((action: string) => {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    setLog((prev) => [{ timestamp, action }, ...prev].slice(0, 10));
  }, []);

  const refresh = useCallback(async () => {
    appendLog('refresh() -- leyendo SQLite');
    const repo = await getOutboxRepository();
    const pendingRows = await repo.listPending();
    const recent = await repo.getMostRecent();
    setPending(pendingRows);
    setMostRecent(recent);
    appendLog(`refresh() completo -- última: ${recent?.id.slice(0, 8)}… estado=${recent?.syncStatus} reintentos=${recent?.retryCount}`);
  }, [appendLog]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runExclusive = useCallback(
    async (label: string, action: () => Promise<void>) => {
      if (busy) {
        appendLog(`IGNORADO (ya hay una acción en curso): ${label}`);
        return;
      }
      setBusy(true);
      appendLog(`INICIO: ${label}`);
      try {
        await action();
        appendLog(`FIN: ${label}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, appendLog],
  );

  const enqueue = () =>
    runExclusive('encolar', async () => {
      const repo = await getOutboxRepository();
      await repo.enqueue({
        operationType: 'diagnostic_note_created',
        aggregateType: 'diagnostic',
        aggregateId: 'diagnostic-fixture',
        payload: { note: 'diagnóstico de desarrollo', createdAtMillis: Date.now() },
      });
      await refresh();
    });

  // Capturan el id ANTES de cualquier `await` (variable local, no leída de
  // nuevo tras esperar) -- así una operación en curso no puede terminar
  // operando sobre un id distinto si `mostRecent` cambiara mientras tanto.
  const markLastSynced = () =>
    runExclusive('markSynced', async () => {
      const targetId = mostRecent?.id;
      if (!targetId) return;
      appendLog(`markSynced(${targetId.slice(0, 8)}…)`);
      const repo = await getOutboxRepository();
      await repo.markSynced(targetId);
      await refresh();
    });

  const markLastFailed = () =>
    runExclusive('markFailed', async () => {
      const targetId = mostRecent?.id;
      if (!targetId) return;
      appendLog(`markFailed(${targetId.slice(0, 8)}…)`);
      const repo = await getOutboxRepository();
      await repo.markFailed(targetId, 'Fallo simulado desde la pantalla de diagnóstico.');
      await refresh();
    });

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Diagnóstico: Offline Outbox (solo dev)
      </Text>
      {busy && <Text style={styles.busyBanner}>Procesando… (botones deshabilitados)</Text>}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={enqueue} disabled={busy}>
          <Text style={styles.buttonText}>Encolar operación de prueba</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={refresh} disabled={busy}>
          <Text style={styles.buttonText}>Refrescar</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={markLastSynced} disabled={busy}>
          <Text style={styles.buttonText}>Marcar última sincronizada</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={markLastFailed} disabled={busy}>
          <Text style={styles.buttonText}>Marcar última fallida</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Última operación (leída de SQLite, cualquier estado):</Text>
      {mostRecent ? (
        <Text style={styles.lastOpDetail} selectable>
          id: {mostRecent.id}
          {'\n'}estado: {mostRecent.syncStatus}
          {'\n'}reintentos: {mostRecent.retryCount}
          {'\n'}creada: {mostRecent.createdAt}
          {'\n'}actualizada: {mostRecent.updatedAt}
        </Text>
      ) : (
        <Text style={styles.item}>(sin operaciones todavía)</Text>
      )}

      <Text style={styles.subtitle}>Pendientes ({pending.length}):</Text>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.id.slice(0, 8)}… — {item.syncStatus} — reintentos: {item.retryCount}
          </Text>
        )}
      />

      <Text style={styles.subtitle}>Registro de acciones (más reciente arriba):</Text>
      <FlatList
        data={log}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <Text style={styles.logItem}>
            {item.timestamp} — {item.action}
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
  busyBanner: { fontSize: 12, color: '#a00', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  item: { fontSize: 12, color: '#333', paddingVertical: 2 },
  lastOpDetail: {
    fontSize: 11,
    color: '#000',
    fontFamily: 'monospace',
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 6,
  },
  logItem: { fontSize: 10, color: '#555', fontFamily: 'monospace' },
});
