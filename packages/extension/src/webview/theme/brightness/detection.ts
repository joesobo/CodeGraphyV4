/**
 * @fileoverview Theme detection re-exports.
 * @module webview/themeDetection
 */

export type ThemeKind = 'light' | 'dark' | 'high-contrast';
export { detectTheme } from './detect';
export { isThemeChangedMessage } from '../messageGuard';
