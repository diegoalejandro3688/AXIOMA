import { Image } from 'react-native';
import trophyAsset from '../../assets/competitive/trophy-lp.webp';

/**
 * COMPETITIVE V1 -- rediseño visual, Incremento 1. Trofeo UNIVERSAL de
 * League Points (`assets/competitive/trophy-lp.webp`, 1024x1024 RGBA) --
 * el MISMO asset para las 7 ligas y para claro/oscuro. Se usa junto a un
 * número (LP / métrica) como representación primaria de los puntos de liga,
 * en lugar del texto "10 LP" / "10 puntos de liga".
 *
 * `resizeMode="contain"`, contenedor cuadrado -- nunca se recorta ni se
 * deforma. Pensado para tamaños pequeños (20–32 px, junto a una cifra) y
 * también mayores (tarjeta de posición del ranking).
 */

const TROPHY = trophyAsset;

export interface LeagueTrophyProps {
  /** Lado del contenedor cuadrado en px. Por defecto 24 (uso en línea junto a una cifra). */
  size?: number;
  /**
   * Etiqueta accesible. Si se omite, el trofeo se marca como decorativo
   * (la cifra de LP contigua ya comunica el dato) -- pásala solo cuando el
   * trofeo aparezca sin un número legible al lado.
   */
  accessibilityLabel?: string;
}

export function LeagueTrophy({ size = 24, accessibilityLabel }: LeagueTrophyProps) {
  const decorative = accessibilityLabel === undefined;
  return (
    <Image
      source={TROPHY}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    />
  );
}
