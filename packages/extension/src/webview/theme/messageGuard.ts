/**
 * @fileoverview Theme message type guard.
 * @module webview/themeMessageGuard
 */

import type { ThemeKind } from './detection';

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
