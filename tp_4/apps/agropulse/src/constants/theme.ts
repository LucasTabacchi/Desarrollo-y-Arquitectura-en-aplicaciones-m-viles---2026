/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const AgroColors = {
  background: '#0f1512',
  backgroundDeep: '#0a0f0d',
  surface: '#171d1a',
  surfaceDark: '#121815',
  surfaceContainer: '#1b211e',
  surfaceContainerHigh: '#252b28',
  surfaceContainerHighest: '#303633',
  primary: '#22c55e',
  primaryDim: '#10b981',
  primaryAccent: '#4edea3',
  onPrimary: '#003824',
  border: '#1f2923',
  borderHighlight: 'rgba(34, 197, 94, 0.2)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  text: '#dee4df',
  textBright: '#ffffff',
  textMuted: '#86948a',
  textSecondary: '#bbcabf',
  statusDry: '#ef4444',
  statusOptimal: '#22c55e',
  statusMoist: '#3b82f6',
  statusStale: '#6b7280',
  statusWarning: '#f59e0b',
  statusError: '#ff5449',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#dee4df',
    background: '#0f1512',
    backgroundElement: '#171d1a',
    backgroundSelected: '#252b28',
    textSecondary: '#86948a',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
