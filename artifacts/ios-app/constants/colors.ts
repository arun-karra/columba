/**
 * Brand palette derived from the shared-notes web app (index.css).
 * HSL → hex conversions: background hsl(42,33%,96%), foreground hsl(174,24%,18%),
 * primary hsl(174,31%,29%), accent hsl(39,89%,68%).
 */
const colors = {
  light: {
    text: '#233937',
    tint: '#2D5250',

    background: '#F8F6F1',
    foreground: '#233937',

    card: '#FDFCF9',
    cardForeground: '#233937',

    primary: '#2D5250',
    primaryForeground: '#FDFCF9',

    secondary: '#E8DFCA',
    secondaryForeground: '#233937',

    muted: '#EDE8DB',
    mutedForeground: '#647572',

    accent: '#F5B93F',
    accentForeground: '#233937',

    destructive: '#D44030',
    destructiveForeground: '#FDFCF9',

    border: '#DDD8CB',
    input: '#DDD8CB',
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
  },

  // 0.875rem from web CSS --radius
  radius: 14,
};

export default colors;
