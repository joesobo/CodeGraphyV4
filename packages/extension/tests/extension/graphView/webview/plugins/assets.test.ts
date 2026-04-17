import { describe, expect, it } from 'vitest';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
} from '../../../../../src/extension/graphView/webview/plugins/resources';
import {
  sendGraphViewContextMenuItems,
  sendGraphViewPluginExporters,
  sendGraphViewPluginWebviewInjections,
  sendGraphViewPluginToolbarActions,
} from '../../../../../src/extension/graphView/webview/plugins/contributionDispatch';
import {
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
} from '../../../../../src/extension/graphView/webview/plugins/updates';

describe('graphView/webview/plugins/assets', () => {
  it('re-exports the plugin webview asset helpers', () => {
    expect(typeof sendGraphViewPluginStatuses).toBe('function');
    expect(typeof sendGraphViewDecorations).toBe('function');
    expect(typeof sendGraphViewContextMenuItems).toBe('function');
    expect(typeof sendGraphViewPluginExporters).toBe('function');
    expect(typeof sendGraphViewPluginToolbarActions).toBe('function');
    expect(typeof sendGraphViewPluginWebviewInjections).toBe('function');
    expect(typeof resolveGraphViewPluginAssetPath).toBe('function');
    expect(typeof getGraphViewWebviewResourceRoots).toBe('function');
    expect(typeof refreshGraphViewResourceRoots).toBe('function');
  });
});
