/**
 * Platform detection and keyboard shortcut formatting helper.
 * Ensures platform-neutral keyboard displays (Ctrl+K on Windows/Linux, ⌘K on macOS).
 */

export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export function formatShortcut(key: string): string {
  const isMac = isMacOS();
  const mod = isMac ? '⌘' : 'Ctrl+';
  return `${mod}${key.toUpperCase()}`;
}

export function getModifierKey(): string {
  return isMacOS() ? '⌘' : 'Ctrl';
}
