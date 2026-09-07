import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { BlockedUser } from '@axioma/contracts';
import { listBlockedUsers, unblockUser } from '../../../lib/api/safety';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Button } from '../../../components/ui';
import { useThemedStyles, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; blocked: BlockedUser[] };

/**
 * PS-0C.2 -- gestión mínima de usuarios bloqueados: lista + desbloquear.
 * Sin búsqueda, sin filtros, sin estadísticas.
 */
export default function BlockedUsersScreen() {
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listBlockedUsers();
    if (result.ok) setState({ status: 'ready', blocked: result.data.blocked });
    else setState({ status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onUnblock = useCallback(
    async (username: string) => {
      setPending(username);
      const result = await unblockUser(username);
      setPending(null);
      if (result.ok) {
        setState((prev) =>
          prev.status === 'ready' ? { status: 'ready', blocked: prev.blocked.filter((b) => b.username !== username) } : prev,
        );
      }
    },
    [],
  );

  if (state.status === 'loading') return <LoadingState message="Cargando…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <View style={styles.container}>
      {state.blocked.length === 0 ? (
        <Text variant="body" color="secondary" style={styles.empty}>
          No has bloqueado a nadie.
        </Text>
      ) : (
        state.blocked.map((b) => (
          <View key={b.username} style={styles.row}>
            <Text variant="body" weight="semibold">
              {b.username}
            </Text>
            <Button
              label="Desbloquear"
              accessibilityLabel={`Desbloquear a ${b.username}`}
              onPress={() => onUnblock(b.username)}
              loading={pending === b.username}
              variant="secondary"
              size="small"
            />
          </View>
        ))
      )}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default, padding: spacing.space5, gap: spacing.space3 },
    empty: { textAlign: 'center' as const, marginTop: spacing.space6 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.space2,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.default,
    },
  };
}
