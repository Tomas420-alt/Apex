export const colors = {
  // Backgrounds
  bg: '#0D0D12',
  surface1: '#1A1A2E',
  surface2: '#252540',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textTertiary: '#555566',

  // Accents
  green: '#00E599',
  blue: '#5B8DEF',
  orange: '#FF9F43',
  red: '#FF6B6B',
  pink: '#FF6B9D',
  purple: '#A855F7',

  // Semantic
  overdue: '#FF6B6B',
  due: '#FF9F43',
  completed: '#00E599',
  savings: '#00E599',

  // Overlay
  overlay: 'rgba(0,0,0,0.7)',

  // Priority badges
  priority: {
    critical: { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B' },
    high: { bg: 'rgba(255,159,67,0.15)', text: '#FF9F43' },
    medium: { bg: 'rgba(168,85,247,0.15)', text: '#A855F7' },
    low: { bg: 'rgba(142,142,160,0.15)', text: '#8E8EA0' },
  } as Record<string, { bg: string; text: string }>,

  // Status badges
  status: {
    pending: { bg: 'rgba(142,142,160,0.15)', text: '#8E8EA0' },
    due: { bg: 'rgba(91,141,239,0.15)', text: '#5B8DEF' },
    overdue: { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B' },
    completed: { bg: 'rgba(0,229,153,0.15)', text: '#00E599' },
    skipped: { bg: 'rgba(85,85,102,0.15)', text: '#555566' },
  } as Record<string, { bg: string; text: string }>,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 24,
  full: 9999,
};
