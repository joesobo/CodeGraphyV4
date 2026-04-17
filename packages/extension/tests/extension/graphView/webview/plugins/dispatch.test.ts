import { describe, expect, it } from 'vitest';
import {
  sendGraphViewContextMenuItems,
  sendGraphViewPluginExporters,
  sendGraphViewPluginToolbarActions,
  sendGraphViewPluginWebviewInjections,
} from '../../../../../src/extension/graphView/webview/plugins/contributionDispatch';
import {
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
} from '../../../../../src/extension/graphView/webview/plugins/updates';

describe('graphView/webview/plugins/dispatch', () => {
  it('re-exports the plugin dispatch helpers', () => {
    expect(typeof sendGraphViewPluginStatuses).toBe('function');
    expect(typeof sendGraphViewDecorations).toBe('function');
    expect(typeof sendGraphViewContextMenuItems).toBe('function');
    expect(typeof sendGraphViewPluginExporters).toBe('function');
    expect(typeof sendGraphViewPluginToolbarActions).toBe('function');
    expect(typeof sendGraphViewPluginWebviewInjections).toBe('function');
  });
});
