import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

/**
 * Theme tokens for React Native Reusables
 * Uses HSL values matching global.css CSS variables
 */
export const THEME = {
  light: {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 0% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(0 0% 3.9%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(0 0% 3.9%)',
    primary: 'hsl(217 91% 60%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96.1%)',
    secondaryForeground: 'hsl(0 0% 9%)',
    muted: 'hsl(0 0% 96.1%)',
    mutedForeground: 'hsl(0 0% 45.1%)',
    accent: 'hsl(0 0% 96.1%)',
    accentForeground: 'hsl(0 0% 9%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 89.8%)',
    input: 'hsl(0 0% 89.8%)',
    ring: 'hsl(217 91% 60%)',
  },
  dark: {
    background: 'hsl(0 0% 4%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(0 0% 8%)',
    cardForeground: 'hsl(0 0% 98%)',
    popover: 'hsl(0 0% 8%)',
    popoverForeground: 'hsl(0 0% 98%)',
    primary: 'hsl(217 91% 60%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 15%)',
    secondaryForeground: 'hsl(0 0% 98%)',
    muted: 'hsl(0 0% 15%)',
    mutedForeground: 'hsl(0 0% 64%)',
    accent: 'hsl(0 0% 15%)',
    accentForeground: 'hsl(0 0% 98%)',
    destructive: 'hsl(0 62% 50%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 15%)',
    input: 'hsl(0 0% 15%)',
    ring: 'hsl(217 91% 60%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
