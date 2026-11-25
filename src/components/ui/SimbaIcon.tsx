import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';
import {useTheme} from '../../theme/ThemeProvider';
import {
  SIMBA_ICON_SPECS,
  type SimbaIconName,
  type SimbaIconSpec,
} from './simbaIconPaths';

export type {SimbaIconName};

export interface SimbaIconProps {
  name: SimbaIconName | (string & {});
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const FALLBACK_SPEC: SimbaIconSpec = SIMBA_ICON_SPECS['play-circle-outline'];

/**
 * Cohesive custom SVG icon renderer for SIMBA.
 * Uses uniform 24x24 viewBox, rounded stroke terminals, and Lion-editorial
 * proportions across every screen, tab bar, button, chip, and player control.
 */
export function SimbaIcon({
  name,
  size = 20,
  color,
  strokeWidth = 1.85,
}: SimbaIconProps) {
  const {colors} = useTheme();
  const resolvedColor = color ?? colors.accent.gold;
  const spec: SimbaIconSpec =
    (SIMBA_ICON_SPECS as Record<string, SimbaIconSpec>)[name] ?? FALLBACK_SPEC;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {spec.fills?.map((d, idx) => (
        <Path key={`f-${idx}`} d={d} fill={resolvedColor} />
      ))}
      {spec.paths?.map((d, idx) => (
        <Path
          key={`p-${idx}`}
          d={d}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {spec.circles?.map((c, idx) => (
        <Circle
          key={`c-${idx}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={c.filled ? resolvedColor : 'none'}
          stroke={c.filled ? 'none' : resolvedColor}
          strokeWidth={c.filled ? 0 : strokeWidth}
        />
      ))}
    </Svg>
  );
}
