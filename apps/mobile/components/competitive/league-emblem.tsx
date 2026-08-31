import { Image, View, type ImageSourcePropType } from 'react-native';
import { useColorSchemeName } from '../../theme';
import { leagueVisual, type LeagueKey } from '../../lib/league/league-visual';
import bronzeEmblem from '../../assets/competitive/league-bronze.webp';
import silverEmblem from '../../assets/competitive/league-silver.webp';
import goldEmblem from '../../assets/competitive/league-gold.webp';
import emeraldEmblem from '../../assets/competitive/league-emerald.webp';
import diamondEmblem from '../../assets/competitive/league-diamond.webp';
import masterEmblem from '../../assets/competitive/league-master.webp';
import grandMasterEmblem from '../../assets/competitive/league-grand-master.webp';

/**
 * COMPETITIVE V1 -- rediseño visual, Incremento 1. Escudo REAL de la liga a
 * partir de `tier` (1..7). El asset aprobado (`assets/competitive/league-<key>.webp`,
 * 1024x1024 RGBA) ES la fuente de verdad visual -- se renderiza tal cual,
 * `resizeMode="contain"`, en un contenedor cuadrado estable: NUNCA se
 * recorta ni se deforma (mismo criterio que `AiTutorMark`).
 *
 * Mismo asset en claro y oscuro (§H) -- solo cambia el halo detrás: sutil en
 * claro, algo más presente en oscuro. `leagueVisual` (puro) resuelve el
 * mapeo tier -> {key, halo}; este componente nunca decide color por su
 * cuenta.
 */

const EMBLEMS: Record<LeagueKey, ImageSourcePropType> = {
  bronze: bronzeEmblem,
  silver: silverEmblem,
  gold: goldEmblem,
  emerald: emeraldEmblem,
  diamond: diamondEmblem,
  master: masterEmblem,
  'grand-master': grandMasterEmblem,
};

export interface LeagueEmblemProps {
  /** `tierOrder` de la liga (1 = Bronce … 7 = Gran Maestro). Fuera de rango se acota. */
  tier: number;
  /** Lado del contenedor cuadrado en px. ~104–132 como referencia inicial (ajustable tras QA Android). */
  size?: number;
  /** Resplandor detrás del escudo. Por defecto activo. */
  halo?: boolean;
  /** Etiqueta accesible. Por defecto "Escudo de la liga <Nombre>". */
  accessibilityLabel?: string;
}

export function LeagueEmblem({ tier, size = 112, halo = true, accessibilityLabel }: LeagueEmblemProps) {
  const scheme = useColorSchemeName();
  const visual = leagueVisual(tier, scheme);
  const box = size;
  const haloOpacity = scheme === 'dark' ? 0.4 : 0.16;

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {halo ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: box * 0.9,
            height: box * 0.9,
            borderRadius: box,
            backgroundColor: visual.halo,
            opacity: haloOpacity,
          }}
        />
      ) : null}
      <Image
        source={EMBLEMS[visual.key]}
        style={{ width: box, height: box }}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel ?? `Escudo de la liga ${visual.name}`}
      />
    </View>
  );
}
