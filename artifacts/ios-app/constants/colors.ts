/**
 * Columba design system — Sky Blue
 * White cards on soft periwinkle backgrounds, deep navy typography.
 * Primary accent sampled from the Columba app icon (#4B7DE6 checkmarks / #93BBEF sky).
 */
const colors = {
  light: {
    text: '#1A2D52',
    tint: '#4B7DE6',

    background: '#F0F5FF',
    foreground: '#1A2D52',

    card: '#FFFFFF',
    cardForeground: '#1A2D52',

    primary: '#4B7DE6',
    primaryForeground: '#FFFFFF',

    secondary: '#E3EDFD',
    secondaryForeground: '#3568C9',

    muted: '#F5F8FE',
    mutedForeground: '#6B82A8',

    accent: '#5A89E8',
    accentForeground: '#FFFFFF',

    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',

    border: 'rgba(75, 125, 230, 0.14)',
    input: 'rgba(75, 125, 230, 0.08)',

    // Status colours (used on note cards / badges)
    urgent: '#DC2626',
    done: '#4B7DE6',
    sky: '#93BBEF',
    lavender: '#9B8FE8',
  },

  dark: {
    text: '#EAF1FF',
    tint: '#7AABF5',

    background: '#0D1526',
    foreground: '#EAF1FF',

    card: '#151F35',
    cardForeground: '#EAF1FF',

    primary: '#6B9BF0',
    primaryForeground: '#0D1526',

    secondary: '#1A2640',
    secondaryForeground: '#EAF1FF',

    muted: '#111A2E',
    mutedForeground: '#8499BE',

    accent: '#7AABF5',
    accentForeground: '#0D1526',

    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    border: 'rgba(255,255,255,0.1)',
    input: 'rgba(255,255,255,0.08)',

    urgent: '#EF4444',
    done: '#6B9BF0',
    sky: '#93BBEF',
    lavender: '#9B8FE8',
  },

  radius: 16,
};

export default colors;
