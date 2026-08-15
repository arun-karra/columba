/**
 * Brand palette for Columba — "Eucalyptus Glass" redesign.
 * Vivid, playful, glass-friendly colours with extra tokens for
 * urgent (coral), done (mint), reminders (sky/lavender), and gradients.
 */
const colors = {
  light: {
    text: '#1A3330',
    tint: '#1E5C54',

    background: '#EBF7F3',
    foreground: '#1A3330',

    card: '#FFFFFF',
    cardForeground: '#1A3330',

    primary: '#1E5C54',
    primaryForeground: '#FFFFFF',

    secondary: '#C5E8DC',
    secondaryForeground: '#1A3330',

    muted: '#D6EEE7',
    mutedForeground: '#5A8078',

    accent: '#F5A623',
    accentForeground: '#FFFFFF',

    destructive: '#FF5A5A',
    destructiveForeground: '#FFFFFF',

    border: 'rgba(30,92,84,0.12)',
    input: 'rgba(30,92,84,0.1)',

    // Status colours
    urgent: '#FF6B5B',
    done: '#34C88A',
    sky: '#5BB8F5',
    lavender: '#9B8FE8',

    // Gradient stops (light)
    gradientStart: '#D4F0E8',
    gradientEnd: '#EBF7F3',
  },

  dark: {
    text: '#DFF0EC',
    tint: '#4AA89A',

    background: '#0A1C1A',
    foreground: '#DFF0EC',

    card: '#162C28',
    cardForeground: '#DFF0EC',

    primary: '#4AA89A',
    primaryForeground: '#0A1C1A',

    secondary: '#1A3530',
    secondaryForeground: '#DFF0EC',

    muted: '#183028',
    mutedForeground: '#6A9990',

    accent: '#F5A623',
    accentForeground: '#0A1C1A',

    destructive: '#FF6B6B',
    destructiveForeground: '#0A1C1A',

    border: 'rgba(255,255,255,0.1)',
    input: 'rgba(255,255,255,0.08)',

    // Status colours
    urgent: '#FF7070',
    done: '#34C88A',
    sky: '#5BB8F5',
    lavender: '#9B8FE8',

    // Gradient stops (dark)
    gradientStart: '#0A1C1A',
    gradientEnd: '#122420',
  },

  radius: 20,
};

export default colors;
