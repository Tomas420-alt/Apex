export const colors = {
  // Backgrounds — deep garage black
  bg: '#050505',
  surface1: '#121212',
  surface2: '#1a1a1a',

  // Borders
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textTertiary: '#555555',

  // Accents — neon cyan
  green: '#00f2ff',
  blue: '#5B8DEF',
  orange: '#FF9F43',
  red: '#FF6B6B',
  pink: '#FF6B9D',
  purple: '#A855F7',

  // Semantic
  overdue: '#FF6B6B',
  due: '#FF9F43',
  completed: '#00f2ff',
  savings: '#00f2ff',

  // Overlay
  overlay: 'rgba(0,0,0,0.8)',

  // Priority badges
  priority: {
    critical: { bg: 'rgba(255,107,107,0.12)', text: '#FF6B6B' },
    high: { bg: 'rgba(255,159,67,0.12)', text: '#FF9F43' },
    medium: { bg: 'rgba(168,85,247,0.12)', text: '#A855F7' },
    low: { bg: 'rgba(136,136,136,0.12)', text: '#888888' },
  } as Record<string, { bg: string; text: string }>,

  // Status badges
  status: {
    pending: { bg: 'rgba(136,136,136,0.12)', text: '#888888' },
    due: { bg: 'rgba(0,242,255,0.12)', text: '#00f2ff' },
    overdue: { bg: 'rgba(255,107,107,0.12)', text: '#FF6B6B' },
    completed: { bg: 'rgba(0,242,255,0.12)', text: '#00f2ff' },
    skipped: { bg: 'rgba(85,85,85,0.12)', text: '#555555' },
  } as Record<string, { bg: string; text: string }>,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 24,
  full: 9999,
};
