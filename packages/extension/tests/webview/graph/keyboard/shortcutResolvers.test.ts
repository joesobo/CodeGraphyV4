import { describe, expect, it } from 'vitest';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from '../../../../src/webview/components/graph/keyboard/shortcutResolvers';

describe('graph/keyboardShortcutResolvers', () => {
  it('returns null for unsupported zoom keys', () => {
    expect(getZoomShortcutCommand('q', false, '2d')).toBeNull();
  });

  it('returns null for unsupported history keys', () => {
    expect(getHistoryShortcutCommand('q', true, false)).toBeNull();
  });
});
