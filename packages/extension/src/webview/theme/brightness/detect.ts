/**
 * @fileoverview Brightness-based theme classification.
 * @module webview/themeBrightness
 */

import { parseColor } from '../../colorParsing';
import type { ThemeKind } from './detection';

function readInitialThemeFallback(): ThemeKind {
  const initialTheme = document.body.dataset.codegraphyTheme;
  return isThemeKind(initialTheme) ? initialTheme : 'dark';
}

function isThemeKind(value: unknown): value is ThemeKind {
  return value === 'light' || value === 'dark' || value === 'high-contrast';
}

function classifyBrightness(brightness: number): ThemeKind {
  if (brightness < 30 || brightness > 240) {
    return 'high-contrast';
  }

  return brightness > 128 ? 'light' : 'dark';
}

/**
 * Detects the current VSCode theme from CSS variables.
 */
export function detectTheme(): ThemeKind {
  const bodyBg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();

  if (!bodyBg) {
    return readInitialThemeFallback();
  }

  const rgb = parseColor(bodyBg);
  if (!rgb) return 'dark';

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return classifyBrightness(brightness);
}
