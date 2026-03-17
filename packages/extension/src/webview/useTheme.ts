/**
 * @fileoverview Hook for detecting and responding to VSCode theme changes.
 */

import { useState, useEffect } from 'react';
import { detectTheme, isThemeChangedMessage } from './themeDetection';
import type { ThemeKind } from './themeDetection';

export type { ThemeKind } from './themeDetection';
export { adjustColorForLightTheme } from './colorParsing';

/**
 * Hook that returns the current VSCode theme and updates on changes.
 */
export function useTheme(): ThemeKind {
  const [theme, setTheme] = useState<ThemeKind>(() => detectTheme());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(detectTheme());
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

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
