import { ScrollView, View } from 'react-native';
import { Dialog } from '../ui/dialog';
import { Text } from '../ui';
import { LeagueEmblem } from './league-emblem';
import { LEAGUE_TIERS, leagueName, clampLeagueTier } from '../../lib/league/league-visual';
import { spacing } from '../../theme';

/**
 * STABILIZATION-B (Finding 8, aprobado por el PO) -- superficie puramente
 * informativa y estática: las 7 ligas en orden ascendente, con el mismo
 * `LeagueEmblem`/`leagueName` ya usados en el resto de Competir (ningún mapeo
 * nuevo). Sin llamada a backend -- las ligas V1 son un conjunto fijo.
 *
 * STABILIZATION-B8 (Polish E) -- `currentTier` OPCIONAL: cuando el llamador
 * conoce la liga vigente de la cuenta (la autoritativa de la participación
 * de la temporada actual, nunca un valor fijo), esa fila -- y sólo esa --
 * lleva el marcador "Tu liga actual". `null`/`undefined` (sin participación
 * vigente) -> ninguna fila marcada. Las 7 filas/orden/assets no cambian.
 */
export function LeagueLadderDialog({
  visible,
  onRequestClose,
  currentTier,
}: {
  visible: boolean;
  onRequestClose: () => void;
  currentTier?: number | null;
}) {
  const highlightedTier = currentTier == null ? null : clampLeagueTier(currentTier);
  return (
    <Dialog visible={visible} title="Ligas de ZETRYND" onRequestClose={onRequestClose} secondaryAction={{ label: 'Cerrar', onPress: onRequestClose, variant: 'tertiary' }}>
      <Text variant="body" color="secondary">
        Compite durante cada temporada, gana LP y avanza por las ligas de ZETRYND.
      </Text>
      <ScrollView style={{ maxHeight: 320 }}>
        <View style={{ gap: spacing.space3, paddingTop: spacing.space2 }}>
          {LEAGUE_TIERS.map((tier) => {
            const isCurrent = tier === highlightedTier;
            return (
              <View key={tier} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space3 }}>
                <LeagueEmblem tier={tier} size={40} halo={false} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="semibold">
                    {leagueName(tier)}
                  </Text>
                  {isCurrent ? (
                    <Text variant="caption" color="success" weight="semibold" accessibilityLabel={`${leagueName(tier)}: tu liga actual`}>
                      Tu liga actual
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Dialog>
  );
}
