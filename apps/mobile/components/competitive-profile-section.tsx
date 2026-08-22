import { View } from 'react-native';
import type { MeCompetitiveProfileResponse } from '@axioma/contracts';
import { CompetitiveIdentityHeader } from './competitive/identity-header';
import { CompetitiveAchievementsList } from './competitive/achievements-list';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui';

/**
 * Sección "Perfil competitivo" dentro de `perfil/index.tsx` -- Bloque IV,
 * Incremento 5, sub-incremento 5.c, EVOLUCIONADA en LEF Bloque V,
 * Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §16) de componente
 * auto-alimentado a componente de PRESENTACIÓN pura.
 *
 * Decisión del Product Owner (LEF Bloque V, Incremento 8): `GET
 * /user/me/advanced-profile` (Incremento 5) ya compone exactamente el mismo
 * dato que este componente antes pedía por su cuenta
 * (`GET .../me/competitive-profile`) -- mantener un segundo fetch aquí
 * habría sido el "fetch duplicado del mismo dato" que el contrato de este
 * incremento exige evitar, además de un segundo loading/error state
 * compitiendo con el de la pantalla contenedora. `perfil/index.tsx` hace
 * la ÚNICA carga canónica y pasa `profile` ya resuelto -- `null` cuando la
 * cuenta todavía no tiene `PublicProfile` (mismo significado que el 404 que
 * antes manejaba este componente internamente), sin duplicar esa
 * interpretación aquí (la pantalla contenedora decide null vs. error).
 *
 * Esta NO es una reapertura del dominio/backend de Bloque IV -- ADR-0021 y
 * `UserService.getMyCompetitiveProfile` permanecen sin cambio; solo cambió
 * CÓMO la superficie móvil obtiene el dato ya expuesto.
 *
 * UI-3 (DG UI3-4): la firma se mantiene EXACTAMENTE `{ profile }` -- el
 * gate histórico `verify-competitive-profile-gate.ts` fija por regex que
 * este componente es presentación pura con esa única prop, y esa condición
 * se preserva deliberadamente. El editor de `displayName` (DG UI3-3) NO
 * vive aquí -- `perfil/index.tsx` lo renderiza inmediatamente ANTES de
 * CompetitiveProfileSection (ver ese archivo), logrando la adyacencia
 * visual con `CompetitiveIdentityHeader` por ORDEN, sin ampliar el
 * contrato de este componente.
 *
 * PROFILE-2 -- `CompetitiveCosmeticsRow` (chips de solo lectura repitiendo
 * en texto lo que el avatar/marco/banner del hero ya muestran visualmente)
 * fue retirado del hero, decisión de producto explícita (sin pérdida
 * funcional: cero interacción, cero navegación, información 100%
 * redundante). `verify-competitive-profile-gate.ts` fue actualizado en el
 * mismo cambio para reflejar esta arquitectura como intencional.
 *
 * PROFILE-3 (decisión del Product Owner, 2026-08-22) -- firma ampliada de
 * `{ profile }` a `{ profile, displayName, onPersonalizePress }`, ambos
 * NUEVOS props OPCIONALES de presentación pura:
 *
 * - `displayName`: viene del agregador YA cargado en `perfil/index.tsx`
 *   (`view.profile?.displayName`) -- este componente NUNCA lo pide ni lo
 *   deriva, solo lo reenvía a `CompetitiveIdentityHeader`. Sigue sin
 *   pertenecer a `MeCompetitiveProfileResponse`/`CompetitiveProfileResponse`
 *   (contrato público, privacidad) -- por eso llega como prop aparte, no
 *   dentro de `profile`.
 * - `onPersonalizePress`: única señal de que este hero es el PROPIO --
 *   controla si `CompetitiveIdentityHeader` muestra el lápiz del avatar
 *   (-> Personalización).
 *
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- cuarto prop
 * OPCIONAL, `onOpenSettings`, mismo criterio de presentación pura que los
 * anteriores: controla si `CompetitiveIdentityHeader` muestra el
 * engranaje del banner (antes tres puntos, mismo destino redundante que el
 * lápiz -- ahora abre el panel de Ajustes en vez de navegar).
 *
 * El gate histórico `verify-competitive-profile-gate.ts` protege que este
 * componente sea presentación pura, sin estado de React propio ni fetch
 * propio -- esa invariante real NO cambia (ningún prop nuevo introduce
 * estado ni llamadas a la API aquí); el gate fue actualizado para
 * reconocer la firma ampliada sin debilitar esa verificación.
 *
 * El heading "Perfil competitivo" se retiró (PROFILE-3) -- el hero pasa a
 * ser el inicio visual real de la pantalla, sin encabezados redundantes.
 *
 * PROFILE-4 (decisión del Product Owner, 2026-08-22) -- `CompetitivePositionCard`
 * (card navy completo) YA NO se renderiza aquí. `profile.competitive` se
 * reenvía en su lugar a `CompetitiveIdentityHeader`, que lo presenta como
 * una fila compacta de metadata junto a Nivel (mismo `describeMyPosition`,
 * sin una segunda interpretación de "sin liga", sin CTA -- la tab bar ya
 * da acceso permanente a Competir). `PublicProfileView` (terceros/preview)
 * NO cambia -- sigue usando `CompetitivePositionCard` completo, asimetría
 * intencional documentada en `verify-competitive-profile-gate.ts`.
 */
export function CompetitiveProfileSection({
  profile,
  displayName,
  onPersonalizePress,
  onOpenSettings,
}: {
  profile: MeCompetitiveProfileResponse | null;
  displayName?: string | null;
  onPersonalizePress?: () => void;
  onOpenSettings?: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  if (profile === null) {
    return (
      <View style={styles.container}>
        <Text variant="bodySmall" color="secondary">
          Configura tu nombre de usuario para tener un perfil competitivo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile.lifecycleStatus === 'RETIRED' ? (
        <Text variant="label" style={styles.retiredBadge}>
          Perfil retirado
        </Text>
      ) : null}
      <CompetitiveIdentityHeader
        username={profile.username}
        displayName={displayName}
        avatar={profile.avatar}
        banner={profile.banner}
        equippedCosmetics={profile.equippedCosmetics}
        levelNumber={profile.levelNumber}
        equippedTitle={profile.equippedTitle}
        competitive={profile.competitive}
        onPersonalizePress={onPersonalizePress}
        onOpenSettings={onOpenSettings}
      />
      <CompetitiveAchievementsList achievements={profile.featuredAchievements} title="Insignias destacadas" />
      <CompetitiveAchievementsList achievements={profile.publicAchievements} />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12, marginTop: 8 },
    retiredBadge: {
      alignSelf: 'flex-start' as const,
      fontSize: 12,
      fontWeight: '700' as const,
      color: t.color.state.warning.text,
      backgroundColor: t.color.state.warning.background,
      borderColor: t.color.state.warning.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
  };
}
