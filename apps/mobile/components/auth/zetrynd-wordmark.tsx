import Svg, { Path } from 'react-native-svg';
import { useColorSchemeName } from '../../theme';

/**
 * TESTER-DISTRIBUTION-1B.2 -- wordmark oficial de ZETRYND, transcripción
 * LITERAL de los 7 paths del asset aprobado (`brand/zetrynd-wordmark-light.svg`
 * / `-dark.svg`, mismos que `brand/ZETRYND_LOGO_MASTER.svg`, grupo
 * `#wordmark`). Ninguna coordenada de los `path` fue reinterpretada --
 * contornos geométricos propios, no dependen de ninguna fuente del sistema.
 *
 * Reemplaza el `<Text>ZETRYND</Text>` provisional (fuente de plataforma)
 * que usaba `AuthBrandHeader` -- decisión de marca cerrada en
 * TESTER-DISTRIBUTION-1B.1b: el wordmark vectorial es la fuente de verdad.
 *
 * Igual que `ZetryndMark`: dos variantes de color ya resueltas por el
 * propio asset (`#04203D` sobre fondo claro, `#F5F6F8` sobre fondo oscuro),
 * nunca `currentColor` themable de forma genérica.
 *
 * `viewBox="0 0 692 100"` (cap height 100) -- `width`/`height` derivados de
 * un único `size` (alto) para preservar el aspect ratio exacto del asset.
 */
export function ZetryndWordmark({ size = 24 }: { size?: number }) {
  const scheme = useColorSchemeName();
  const fillColor = scheme === 'dark' ? '#F5F6F8' : '#04203D';
  const width = size * (692 / 100);

  return (
    <Svg width={width} height={size} viewBox="0 0 692 100" fill={fillColor} accessibilityLabel="ZETRYND">
      <Path d="M0 0H68V13L19 87H68V100H0V87L49 13H0Z" />
      <Path d="M96 0H160V13H111V42H153V55H111V87H160V100H96Z" />
      <Path d="M188 0H260V13H231V100H216V13H188Z" />
      <Path
        fillRule="evenodd"
        d="M288 0H326C350 0 363 11 363 29C363 44 354 53 340 57L367 100H349L324 59H303V100H288ZM303 13V46H325C340 46 348 41 348 29C348 18 340 13 325 13Z"
      />
      <Path d="M389 0H406L431 41L456 0H473L439 55V100H423V55Z" />
      <Path d="M501 0H517L561 76V0H576V100H560L516 24V100H501Z" />
      <Path
        fillRule="evenodd"
        d="M606 0H638C672 0 692 19 692 50S672 100 638 100H606ZM621 13V87H637C663 87 677 75 677 50S663 13 637 13Z"
      />
    </Svg>
  );
}
