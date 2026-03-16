/**
 * @fileoverview Theme detection from CSS variables.
 * @module webview/themeDetection
 */

import { parseColor } from './colorParsing';

export type ThemeKind = 'light' | 'dark' | 'high-contrast';

type ThemeChangedMessage = { type: 'THEME_CHANGED'; payload: { kind: ThemeKind } };

export function isThemeChangedMessage(data: unknown): data is ThemeChangedMessage {
  if (!data || typeof data !== 'object') return false;
  const message = data as { type?: unknown; payload?: { kind?: unknown } };
  return (
    message.type === 'THEME_CHANGED' &&
    (message.payload?.kind === 'light' ||
      message.payload?.kind === 'dark' ||
      message.payload?.kind === 'high-contrast')
  );
}

/**
 * Detects the current VSCode theme from CSS variables.
 */
export function detectTheme(): ThemeKind {
  const bodyBg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();

  if (!bodyBg) return 'dark';

  const rgb = parseColor(bodyBg);
  if (!rgb) return 'dark';

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  if (brightness < 30 || brightness > 240) {
    return 'high-contrast';
  }

  return brightness > 128 ? 'light' : 'dark';
}
