/**
 * Columba design system — Sky Blue
 * Brand color #A0C2E5 with softer tints for surfaces and deeper blues for buttons.
 */
const colors = {
  light: {
    text: '#2D4A66',
    tint: '#5B8DBF',

    /** Flat fallback when a gradient is not used */
    background: '#E8F3FB',
    gradientStart: '#A0C2E5',
    gradientEnd: '#EDF6FC',

    foreground: '#2D4A66',

    card: '#FFFFFF',
    cardForeground: '#2D4A66',

    /** Buttons, links, active controls */
    primary: '#5B8DBF',
    primaryForeground: '#FFFFFF',

    secondary: '#C8DFF2',
    secondaryForeground: '#3D6A94',

    muted: '#F2F8FD',
    mutedForeground: '#6B8499',

    accent: '#7EB0DC',
    accentForeground: '#FFFFFF',

    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',

    border: 'rgba(91, 141, 191, 0.18)',
    input: 'rgba(91, 141, 191, 0.1)',

    urgent: '#DC2626',
    done: '#5B8DBF',
    sky: '#A0C2E5',
    lavender: '#9B8FE8',
  },

  dark: {
    text: '#E8F2FA',
    tint: '#A0C2E5',

    background: '#152232',
    gradientStart: '#1E3044',
    gradientEnd: '#2A4560',

    foreground: '#E8F2FA',

    card: '#1C2E42',
    cardForeground: '#E8F2FA',

    primary: '#A0C2E5',
    primaryForeground: '#152232',

    secondary: '#243A52',
    secondaryForeground: '#E8F2FA',

    muted: '#182838',
    mutedForeground: '#8FA8BE',

    accent: '#B8D4EF',
    accentForeground: '#152232',

    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    border: 'rgba(255,255,255,0.1)',
    input: 'rgba(255,255,255,0.08)',

    urgent: '#EF4444',
    done: '#A0C2E5',
    sky: '#A0C2E5',
    lavender: '#9B8FE8',
  },

  radius: 16,
};

export default colors;
