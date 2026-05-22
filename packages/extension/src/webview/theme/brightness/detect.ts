/**
 * @fileoverview Brightness-based theme classification.
 * @module webview/themeBrightness
 */

import { parseColor } from '../../colorParsing';
import type { ThemeKind } from './detection';

/**
 * Detects the current VSCode theme from CSS variables.
 */
export function detectTheme(): ThemeKind {
  const bodyBg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();

  if (!bodyBg) {
    const initialTheme = document.body.dataset.codegraphyTheme;
    if (
      initialTheme === 'light'
      || initialTheme === 'dark'
      || initialTheme === 'high-contrast'
    ) {
      return initialTheme;
    }

    return 'dark';
  }

  const rgb = parseColor(bodyBg);
  if (!rgb) return 'dark';

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  if (brightness < 30 || brightness > 240) {
    return 'high-contrast';
  }

  return brightness > 128 ? 'light' : 'dark';
}
