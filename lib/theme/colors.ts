/**
 * Theme color constants for use in style objects and props.
 *
 * React Native components that require style objects (React Navigation, some RN props)
 * cannot use Tailwind classes. This file provides the same theme colors as CSS variables
 * in global.css for use in those contexts.
 *
 * For components that support className, prefer Tailwind semantic classes:
 * - bg-background, bg-card, bg-secondary, bg-muted, bg-destructive
 * - text-foreground, text-muted-foreground, text-destructive
 * - border-border, border-input
 *
 * These constants mirror the @theme block in global.css.
 */

// Base semantic colors (dark mode - app default)
export const colors = {
  // Backgrounds
  background: '#0a0a0a', // hsl(0 0% 4%)
  foreground: '#fafafa', // hsl(0 0% 98%)

  card: '#141414', // hsl(0 0% 8%)
  cardForeground: '#fafafa',

  popover: '#141414', // hsl(0 0% 8%)
  popoverForeground: '#fafafa',

  // Interactive
  primary: '#3b82f6', // hsl(217 91% 60%)
  primaryForeground: '#fafafa',

  secondary: '#262626', // hsl(0 0% 15%)
  secondaryForeground: '#fafafa',

  muted: '#262626', // hsl(0 0% 15%)
  mutedForeground: '#a1a1aa', // hsl(0 0% 64%)

  accent: '#262626', // hsl(0 0% 15%)
  accentForeground: '#fafafa',

  destructive: '#dc2626', // hsl(0 62% 50%)
  destructiveForeground: '#fafafa',

  // Utility
  border: '#262626', // hsl(0 0% 15%)
  input: '#262626',
  ring: '#3b82f6',

  // Extended palette for specific UI elements
  // These are derived from the base palette
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500 (same as primary)

  // Tertiary text (more muted than mutedForeground)
  tertiary: '#71717a', // zinc-500

  // Disabled state
  disabled: '#52525b', // zinc-600

  // Subtle borders and backgrounds
  subtle: '#27272a', // zinc-800
  subtleBorder: '#3f3f46', // zinc-700
} as const;

// Spacing tokens (for style objects)
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

// Border radius tokens
export const radius = {
  none: 0,
  sm: 4, // 0.25rem
  md: 6, // 0.375rem
  lg: 8, // 0.5rem
  xl: 12, // 0.75rem
  '2xl': 16, // 1rem
  '3xl': 24, // 1.5rem
  full: 9999,
} as const;

// Syntax highlighting colors (for code blocks)
export const syntaxColors = {
  keyword: '#c792ea', // purple
  string: '#c3e88d', // green
  comment: '#546e7a', // gray
  number: '#f78c6c', // orange
  normal: '#e0e0e0', // light gray
} as const;

// Language-specific colors (for badges/indicators)
export const languageColors = {
  python: '#3776ab',
  javascript: '#f7df1e',
  typescript: '#3178c6',
  rust: '#dea584',
  go: '#00add8',
} as const;

// Weather-specific colors (for WeatherTool gradients)
export const weatherColors = {
  daySky: ['#38bdf8', '#3b82f6', '#2563eb'], // sky-400, blue-500, blue-600
  nightSky: ['#312e81', '#581c87', '#1e293b'], // indigo-900, purple-900, slate-800
  sunAccent: '#FEF08A', // yellow-200
  moonAccent: '#93C5FD', // blue-300
} as const;

// Temperature colors (for TemperatureTool)
export const temperatureColors = {
  hot: '#7f1d1d', // red-900
  cold: '#1e3a5f', // custom blue
} as const;

export default colors;
