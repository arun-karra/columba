import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

/** Apple HIG: 16pt side margins on iPhone; extra inset on iPad. */
export const SCREEN_GUTTER = 16;
export const FAB_SIZE = 56;
export const FAB_GAP = 16;
export const IPAD_READABLE_WIDTH = 700;
export const TAB_ITEM_HEIGHT = 49;

export function useIsCompactWidth() {
  const { width } = useWindowDimensions();
  return width < 768;
}

/** Horizontal padding that centers content on iPad. */
export function useScreenGutter() {
  const { width } = useWindowDimensions();
  if (width >= 768) {
    return Math.max(SCREEN_GUTTER, (width - IPAD_READABLE_WIDTH) / 2);
  }
  return SCREEN_GUTTER;
}

/**
 * Distance from the bottom of a tab screen to sit a FAB above the tab bar.
 * Native overlaying tab bars (iOS 26 liquid glass) still need the home-indicator
 * + tab-item height. In-flow tab bars already consume that space.
 */
export function useFabBottom(gap = FAB_GAP) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return insets.bottom + TAB_ITEM_HEIGHT + gap;
  }
  return gap;
}

/** Extra list padding so the last row clears a FAB. */
export function useListBottomPadding(hasFab = false) {
  const fabBottom = useFabBottom();
  return (hasFab ? fabBottom + FAB_SIZE + FAB_GAP : FAB_GAP) + 8;
}
