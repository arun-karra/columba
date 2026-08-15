import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' && colors.dark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}

type ColorTokens = ReturnType<typeof useColors>;

/**
 * Cycles a group avatar through the brand's three accent colors
 * (teal / amber / purple), so a groups list isn't monotone. Pass the
 * group's list index where available (list screens); pass its id where
 * it isn't (a single group's detail screen) for a stable, still-varied
 * color per group.
 */
export function groupAvatarColor(tokens: ColorTokens, indexOrId: number | string) {
  const palette = [tokens.primary, tokens.accent, tokens.groupTertiary];
  const index =
    typeof indexOrId === 'number'
      ? indexOrId
      : indexOrId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[index % palette.length];
}
