import { describe, expect, it } from 'vitest';
import {
  getHistoryShortcutCommand,
  getToolbarShortcutCommand,
  getZoomShortcutCommand,
} from '../../../src/webview/components/graph/keyboardShortcutResolvers';

describe('graph/keyboardShortcutResolvers', () => {
  it('returns null for unsupported zoom keys', () => {
    expect(getZoomShortcutCommand('q', false, '2d')).toBeNull();
  });

  it('returns null for unsupported history keys', () => {
    expect(getHistoryShortcutCommand('q', true, false)).toBeNull();
  });

  it('returns null for unsupported toolbar keys', () => {
    expect(getToolbarShortcutCommand('q', false)).toBeNull();
  });
});
