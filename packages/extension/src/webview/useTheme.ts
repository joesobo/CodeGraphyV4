/**
 * @fileoverview Hook for detecting and responding to VSCode theme changes.
 */

import { useState, useEffect } from 'react';
import { parseColor } from './colorParsing';

export { adjustColorForLightTheme } from './colorParsing';

export type ThemeKind = 'light' | 'dark' | 'high-contrast';
type ThemeChangedMessage = { type: 'THEME_CHANGED'; payload: { kind: ThemeKind } };

function isThemeChangedMessage(data: unknown): data is ThemeChangedMessage {
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
function detectTheme(): ThemeKind {
  // Check for high contrast first
  const bodyBg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();

  if (!bodyBg) return 'dark'; // Default

  // Parse the color and determine brightness
  const rgb = parseColor(bodyBg);
  if (!rgb) return 'dark';

  // Calculate perceived brightness
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  // High contrast themes typically have very dark or very light backgrounds
  if (brightness < 30 || brightness > 240) {
    return 'high-contrast';
  }

  return brightness > 128 ? 'light' : 'dark';
}

/**
 * Hook that returns the current VSCode theme and updates on changes.
 */
export function useTheme(): ThemeKind {
  const [theme, setTheme] = useState<ThemeKind>(() => detectTheme());

  useEffect(() => {
    // Re-detect theme when CSS variables change
    const observer = new MutationObserver(() => {
      setTheme(detectTheme());
    });

    // Observe changes to the body's style (VSCode updates CSS vars there)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Also listen for messages from extension
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isThemeChangedMessage(event.data)) return;
      setTheme(event.data.payload.kind);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return theme;
}
