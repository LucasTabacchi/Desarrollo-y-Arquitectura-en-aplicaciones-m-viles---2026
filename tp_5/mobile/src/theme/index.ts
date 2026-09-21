/**
 * Industrial Utilitarian Brutalist Design System Tokens
 * Directly matched to the stitch_network_qos_monitor_ui design system
 */

export const colors = {
  // Surface Tiering
  surface: '#101419',
  surfaceDim: '#101419',
  surfaceBright: '#36393f',
  surfaceContainerLowest: '#0a0e13',
  surfaceContainerLow: '#181c21',
  surfaceContainer: '#1c2025',
  surfaceContainerHigh: '#262a30',
  surfaceContainerHighest: '#31353b',

  // Foreground
  onSurface: '#e0e2ea',
  onSurfaceVariant: '#c1c6d6',
  outline: '#8b919f',
  outlineVariant: '#263242', // Tactical gridline border

  // Primary (Cyan/Blue phosphor)
  primary: '#aac7ff',
  onPrimary: '#002f65',
  primaryContainer: '#418fff',
  onPrimaryContainer: '#002959',

  // Secondary (Signal Green phosphor - Nominal / SLA OK)
  secondary: '#6fdd78',
  onSecondary: '#00390e',
  secondaryContainer: '#01872e',
  onSecondaryContainer: '#f7fff1',

  // Tertiary (Amber phosphor - Warning / Jitter Degradation)
  tertiary: '#fabc45',
  onTertiary: '#422c00',
  tertiaryContainer: '#bd8708',
  onTertiaryContainer: '#392600',

  // Error (Hazard Red phosphor - Critical / Packet Loss / Timeout)
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // Oscilloscope canvas background
  scopeBg: '#090d12',
  scopeGrid: '#1c2733',
  scopeMajorGrid: '#263545',
} as const;

export const typography = {
  fontFamilyMono: 'JetBrains Mono, monospace, monospace',
  fontFamilySans: 'IBM Plex Sans, sans-serif, sans-serif',
};

export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};
