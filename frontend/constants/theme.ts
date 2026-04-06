/**
 * PachApp Design System — Eco-themed dark mode color palette and typography
 */

export const Colors = {
  // Core background
  background: '#0a0f1c',
  surface: '#111827',
  surfaceLight: '#1a2332',
  card: '#1e293b',
  cardHover: '#243244',

  // Primary — Eco green
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#059669',
  primaryGlow: 'rgba(16, 185, 129, 0.15)',

  // Secondary — Ocean blue
  secondary: '#06b6d4',
  secondaryLight: '#22d3ee',

  // Accent — Amber for points/rewards
  accent: '#f59e0b',
  accentLight: '#fbbf24',

  // Text
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Borders
  border: '#1e293b',
  borderLight: '#334155',

  // Gradient pairs
  gradientGreen: ['#059669', '#10b981'] as const,
  gradientBlue: ['#0891b2', '#06b6d4'] as const,
  gradientAmber: ['#d97706', '#f59e0b'] as const,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const Typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  number: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.accent,
    letterSpacing: -1,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
};
