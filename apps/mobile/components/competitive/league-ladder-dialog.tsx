import { ScrollView, View } from 'react-native';
import { Dialog } from '../ui/dialog';
import { Text } from '../ui';
import { LeagueEmblem } from './league-emblem';
import { LEAGUE_TIERS, leagueName } from '../../lib/league/league-visual';
import { spacing } from '../../theme';

/**
 * STABILIZATION-B (Finding 8, aprobado por el PO) -- superficie puramente
 * informativa y estática: las 7 ligas en orden ascendente, con el mismo
 * `LeagueEmblem`/`leagueName` ya usados en el resto de Competir (ningún mapeo
 * nuevo). Sin llamada a backend -- las ligas V1 son un conjunto fijo.
 */
export function LeagueLadderDialog({ visible, onRequestClose }: { visible: boolean; onRequestClose: () => void }) {
  return (
    <Dialog visible={visible} title="Ligas de ZETRYND" onRequestClose={onRequestClose} secondaryAction={{ label: 'Cerrar', onPress: onRequestClose, variant: 'tertiary' }}>
      <Text variant="body" color="secondary">
        Compite durante cada temporada, gana LP y avanza por las ligas de ZETRYND.
      </Text>
      <ScrollView style={{ maxHeight: 320 }}>
        <View style={{ gap: spacing.space3, paddingTop: spacing.space2 }}>
          {LEAGUE_TIERS.map((tier) => (
            <View key={tier} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space3 }}>
              <LeagueEmblem tier={tier} size={40} halo={false} />
              <Text variant="body" weight="semibold">
                {leagueName(tier)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Dialog>
  );
}
