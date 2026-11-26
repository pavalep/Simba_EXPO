import React, {useMemo} from 'react';
import {SvgXml} from 'react-native-svg';
import {useTheme} from '../../theme/ThemeProvider';
import {SIMBA_ICON_BODIES, type SimbaIconName} from './simbaIconPaths';

export type {SimbaIconName};

export interface SimbaIconProps {
  name: SimbaIconName | (string & {});
  size?: number;
  color?: string;
}

const FALLBACK_BODY = SIMBA_ICON_BODIES['play-circle-outline'];

/**
 * Official Solar Icons (Line Duotone + Bold) renderer powered by
 * `react-native-svg`'s native `<SvgXml>` parser — zero custom conversion,
 * 100% faithful vector geometry, transforms, and two-tone duotone opacity.
 */
export function SimbaIcon({name, size = 20, color}: SimbaIconProps) {
  const {colors} = useTheme();
  const resolvedColor = color ?? colors.accent.gold;

  const xml = useMemo(() => {
    const body =
      (SIMBA_ICON_BODIES as Record<string, string>)[name] ?? FALLBACK_BODY;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${body}</svg>`;
  }, [name]);

  return (
    <SvgXml xml={xml} width={size} height={size} color={resolvedColor} />
  );
}
