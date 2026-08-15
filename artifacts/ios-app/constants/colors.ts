/**
 * Brand palette for Columba.
 * Light theme refreshed from the "Columba Notes" Claude Design mockup —
 * OKLCH → hex (CSS-style gamut-mapped, not per-channel clamped):
 * primary oklch(58% 0.11 175), accent oklch(60% 0.14 75),
 * foreground oklch(28% 0.035 200), background oklch(93% 0.025 85).
 */
const colors = {
  light: {
    text: '#112E30',
    tint: '#008F77',

    background: '#F0E7D6',
    foreground: '#112E30',

    card: '#FEFBF6',
    cardForeground: '#112E30',

    primary: '#008F77',
    primaryForeground: '#F8FDFB',

    secondary: '#EEE7D9',
    secondaryForeground: '#112E30',

    muted: '#EEE7D9',
    mutedForeground: '#5C6D6D',

    accent: '#AC7300',
    accentForeground: '#F8FDFB',

    destructive: '#B32228',
    destructiveForeground: '#F8FDFB',

    border: '#E3DDD3',
    input: '#E3DDD3',

    // Third color for group-avatar variety (mockup's GROUP_COLORS), from
    // oklch(62% 0.14 320).
    groupTertiary: '#AB68BA',
  },

  dark: {
    text: '#F0EBE0',
    tint: '#5B9088',

    background: '#0D1E1C',
    foreground: '#F0EBE0',

    card: '#152B28',
    cardForeground: '#F0EBE0',

    primary: '#5B9088',
    primaryForeground: '#0D1E1C',

    secondary: '#1E3330',
    secondaryForeground: '#F0EBE0',

    muted: '#1A2D2B',
    mutedForeground: '#8EA09C',

    accent: '#F5B93F',
    accentForeground: '#0D1E1C',

    destructive: '#E05040',
    destructiveForeground: '#F0EBE0',

    border: '#1E3330',
    input: '#273C39',

    groupTertiary: '#C889D7',
  },

  // Refreshed from the mockup's rounder cards/inputs (was 14).
  radius: 20,
};

export default colors;
