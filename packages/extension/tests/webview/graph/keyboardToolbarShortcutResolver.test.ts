import { describe, expect, it } from 'vitest';
import { getToolbarShortcutCommand } from '../../../src/webview/components/graph/keyboardToolbarShortcutResolver';

describe('graph/keyboardToolbarShortcutResolver', () => {
  it('returns null for unsupported toolbar keys', () => {
    expect(getToolbarShortcutCommand('q', false)).toBeNull();
  });

  it('maps toolbar shortcuts when no modifier is pressed', () => {
    expect(getToolbarShortcutCommand('v', false)).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_VIEW' } }],
    });
    expect(getToolbarShortcutCommand('L', false)).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_LAYOUT' } }],
    });
    expect(getToolbarShortcutCommand('t', false)).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'TOGGLE_DIMENSION' } }],
    });
  });

  it('ignores toolbar shortcuts when a modifier is pressed', () => {
    expect(getToolbarShortcutCommand('v', true)).toBeNull();
    expect(getToolbarShortcutCommand('L', true)).toBeNull();
    expect(getToolbarShortcutCommand('t', true)).toBeNull();
  });
});
