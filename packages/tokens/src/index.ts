/**
 * @nikit/tokens
 * JavaScript & TypeScript exports for design system tokens
 */

export const colors = {
  bg: {
    canvas: 'var(--nikit-bg-canvas)',
    base: 'var(--nikit-bg-base)',
    surface: 'var(--nikit-bg-surface)',
    surfaceRaised: 'var(--nikit-bg-surface-raised)',
    surfaceElevated: 'var(--nikit-bg-surface-elevated)',
    surfaceOverlay: 'var(--nikit-bg-surface-overlay)',
    hover: 'var(--nikit-bg-hover)',
    active: 'var(--nikit-bg-active)',
    selected: 'var(--nikit-bg-selected)',
  },
  text: {
    primary: 'var(--nikit-text-primary)',
    secondary: 'var(--nikit-text-secondary)',
    tertiary: 'var(--nikit-text-tertiary)',
    disabled: 'var(--nikit-text-disabled)',
    inverse: 'var(--nikit-text-inverse)',
    code: 'var(--nikit-text-code)',
  },
  border: {
    subtle: 'var(--nikit-border-subtle)',
    default: 'var(--nikit-border-default)',
    strong: 'var(--nikit-border-strong)',
    hover: 'var(--nikit-border-hover)',
    focus: 'var(--nikit-border-focus)',
  },
  accent: {
    base: 'var(--nikit-accent-base)',
    hover: 'var(--nikit-accent-hover)',
    active: 'var(--nikit-accent-active)',
    subtle: 'var(--nikit-accent-subtle)',
    text: 'var(--nikit-accent-text)',
    glow: 'var(--nikit-accent-glow)',
  },
  semantic: {
    success: 'var(--nikit-success-base)',
    warning: 'var(--nikit-warning-base)',
    danger: 'var(--nikit-danger-base)',
    local: 'var(--nikit-local-base)',
  },
} as const;

export const spacing = {
  0: 'var(--nikit-space-0)',
  0.5: 'var(--nikit-space-0-5)',
  1: 'var(--nikit-space-1)',
  1.5: 'var(--nikit-space-1-5)',
  2: 'var(--nikit-space-2)',
  2.5: 'var(--nikit-space-2-5)',
  3: 'var(--nikit-space-3)',
  3.5: 'var(--nikit-space-3-5)',
  4: 'var(--nikit-space-4)',
  5: 'var(--nikit-space-5)',
  6: 'var(--nikit-space-6)',
  7: 'var(--nikit-space-7)',
  8: 'var(--nikit-space-8)',
  10: 'var(--nikit-space-10)',
  12: 'var(--nikit-space-12)',
  16: 'var(--nikit-space-16)',
  20: 'var(--nikit-space-20)',
} as const;

export const radii = {
  none: 'var(--nikit-radius-none)',
  xs: 'var(--nikit-radius-xs)',
  sm: 'var(--nikit-radius-sm)',
  md: 'var(--nikit-radius-md)',
  lg: 'var(--nikit-radius-lg)',
  xl: 'var(--nikit-radius-xl)',
  '2xl': 'var(--nikit-radius-2xl)',
  full: 'var(--nikit-radius-full)',
} as const;

export const shadows = {
  none: 'var(--nikit-shadow-none)',
  sm: 'var(--nikit-shadow-sm)',
  md: 'var(--nikit-shadow-md)',
  lg: 'var(--nikit-shadow-lg)',
  xl: 'var(--nikit-shadow-xl)',
  glow: 'var(--nikit-shadow-glow)',
} as const;

export const typography = {
  fonts: {
    sans: 'var(--nikit-font-sans)',
    mono: 'var(--nikit-font-mono)',
  },
  sizes: {
    '2xs': 'var(--nikit-text-2xs)',
    xs: 'var(--nikit-text-xs)',
    sm: 'var(--nikit-text-sm)',
    base: 'var(--nikit-text-base)',
    md: 'var(--nikit-text-md)',
    lg: 'var(--nikit-text-lg)',
    xl: 'var(--nikit-text-xl)',
    '2xl': 'var(--nikit-text-2xl)',
    '3xl': 'var(--nikit-text-3xl)',
    '4xl': 'var(--nikit-text-4xl)',
  },
  weights: {
    light: 'var(--nikit-weight-light)',
    regular: 'var(--nikit-weight-regular)',
    medium: 'var(--nikit-weight-medium)',
    semibold: 'var(--nikit-weight-semibold)',
    bold: 'var(--nikit-weight-bold)',
  },
} as const;

export const layout = {
  headerHeight: 'var(--nikit-header-height)',
  sidebarWidth: 'var(--nikit-sidebar-width)',
  sidebarCollapsedWidth: 'var(--nikit-sidebar-collapsed-width)',
  readingWidth: 'var(--nikit-reading-width)',
  composerMaxWidth: 'var(--nikit-composer-max-width)',
  dialogMaxWidth: 'var(--nikit-dialog-max-width)',
  commandMaxWidth: 'var(--nikit-command-max-width)',
  popoverMaxWidth: 'var(--nikit-popover-max-width)',
} as const;

export type AccentTheme = 'cobalt' | 'indigo' | 'cyan' | 'amber' | 'emerald';
