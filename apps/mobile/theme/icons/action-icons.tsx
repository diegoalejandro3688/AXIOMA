import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { NavIconProps } from './nav-icons';

/**
 * Iconos de acción mínimos para las primitivas de UI-1 -- caja 24x24,
 * trazo 2px, extremos/uniones redondeados, color heredado vía prop.
 */

export function ChevronRightIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BackArrowIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 6.5 10 6.5a13.6 13.6 0 0 1-3.1 3.9M6.5 6.8C4 8.4 2 11.5 2 11.5s3.5 6.5 10 6.5c1.2 0 2.3-.2 3.3-.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.9 12.6a2.5 2.5 0 0 0 3.5 3.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function XCircleIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ size = 24, color }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="11" x2="12" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="7.75" r="1" fill={color} stroke="none" />
    </Svg>
  );
}

