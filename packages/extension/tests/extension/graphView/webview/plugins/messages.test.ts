import { describe, expect, it } from 'vitest';
import {
  buildGraphViewDecorationPayload,
  collectGraphViewContextMenuItems,
  collectGraphViewExporters,
  collectGraphViewToolbarActions,
  collectGraphViewWebviewInjections,
} from '../../../../../src/extension/graphView/webview/plugins/messages';

describe('graphView/webview/plugins/messages', () => {
  it('re-exports the plugin webview message helpers', () => {
    expect(typeof buildGraphViewDecorationPayload).toBe('function');
    expect(typeof collectGraphViewContextMenuItems).toBe('function');
    expect(typeof collectGraphViewExporters).toBe('function');
    expect(typeof collectGraphViewToolbarActions).toBe('function');
    expect(typeof collectGraphViewWebviewInjections).toBe('function');
  });
});
