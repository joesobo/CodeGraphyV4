import { describe, expect, it } from 'vitest';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from '../../../../src/webview/components/graph/keyboard/shortcutResolvers';

describe('graph/keyboardShortcutResolvers', () => {
  it('returns null for unsupported zoom keys', () => {
    expect(getZoomShortcutCommand('q', false)).toBeNull();
  });

  it('creates zoom shortcuts', () => {
    expect(getZoomShortcutCommand('+', false)).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'zoom', factor: 1.2 }],
    });
    expect(getZoomShortcutCommand('-', false)).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'zoom', factor: 1 / 1.2 }],
    });
  });

  it('returns null for unsupported history keys', () => {
    expect(getHistoryShortcutCommand('q', true, false)).toBeNull();
  });
});
