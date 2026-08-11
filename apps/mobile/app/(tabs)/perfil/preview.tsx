import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { CompetitiveProfileResponse } from '@axioma/contracts';
import { getMyProfilePreview } from '../../../lib/api/preview';
import { PublicProfileView } from '../../../components/competitive/public-profile-view';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_presentable' }
  | { status: 'ready'; profile: CompetitiveProfileResponse };

/**
 * Vista previa pública -- LEF Bloque V, Incremento 8/7
 * (docs/adr/LEF-BLOCK-V-DEFINITION.md §15/§16). Consume EXCLUSIVAMENTE
 * `GET /user/public-profile/me/preview` (Incremento 7, ya cerrado) y
 * representa el contrato recibido tal cual, vía `PublicProfileView` -- el
 * MISMO componente que renderiza el perfil de un tercero real
 * (`competir/perfil/[username].tsx`). Ninguna lógica propia aquí: sin
 * reconstruir visibilidad, sin recalcular campos, sin combinar con
 * `advanced-profile` para "completar huecos" -- esta pantalla es
 * deliberadamente más pobre en datos que `index.tsx` (sin resumen
 * académico, sin historial competitivo, sin catálogo owned/locked),
 * exactamente porque eso es lo que un tercero real vería.
 *
 * 404 (perfil PRIVATE o lifecycle no presentable) es el ESTADO ESPERADO de
 * "así es como te ven los demás ahora mismo" -- nunca se presenta como un
 * error técnico genérico (mismo criterio que el 404 uniforme de
 * `[username].tsx`, Bloque IV, aplicado aquí a la propia cuenta vista desde
 * afuera).
 */
export default function PublicProfilePreviewScreen() {
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getMyProfilePreview();
    if (result.ok) {
      setState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      setState({ status: 'not_presentable' });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando vista previa…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.status === 'not_presentable') {
    return (
      <View style={styles.notPresentableContainer}>
        <Text style={styles.notPresentableTitle} accessibilityRole="header">
          Así te ven ahora mismo otros usuarios
        </Text>
        <Text style={styles.notPresentableMessage}>
          Tu perfil no es visible públicamente en este momento, así que otras personas no pueden verlo. Esto es exactamente lo que verían.
        </Text>
      </View>
    );
  }

  return <PublicProfileView profile={state.profile} />;
}

function createStyles(t: ThemeTokens) {
  return {
    notPresentableContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24, gap: 8, backgroundColor: t.color.background.default },
    notPresentableTitle: { fontSize: 17, fontWeight: '700' as const, color: t.color.text.primary, textAlign: 'center' as const },
    notPresentableMessage: { fontSize: 14, color: t.color.text.secondary, textAlign: 'center' as const },
  };
}
