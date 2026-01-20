/**
 * Theme configuration - Dark theme inspired by chat-sdk.dev
 */

export const colors = {
  // Background colors
  background: {
    primary: "#0a0a0a",      // Main background
    secondary: "#141414",    // Card/panel background
    tertiary: "#1a1a1a",     // Elevated surfaces
    hover: "#262626",        // Hover states
  },

  // Text colors
  text: {
    primary: "#fafafa",      // Primary text
    secondary: "#a1a1aa",    // Secondary/muted text
    tertiary: "#71717a",     // Tertiary/placeholder
    inverse: "#0a0a0a",      // Text on light backgrounds
  },

  // Border colors
  border: {
    default: "#27272a",      // Default borders
    subtle: "#1f1f23",       // Subtle borders
    focus: "#3b82f6",        // Focus rings
  },

  // Accent colors
  accent: {
    primary: "#3b82f6",      // Primary blue
    primaryHover: "#2563eb",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  },

  // Message bubble colors
  message: {
    user: {
      background: "#27272a",  // Grey instead of blue
      text: "#fafafa",
    },
    assistant: {
      background: "#1a1a1a",
      text: "#fafafa",
    },
  },

  // Code/artifact colors
  code: {
    background: "#0d0d0d",
    text: "#d4d4d4",
    border: "#27272a",
    lineNumbers: "#525252",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
