import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderPluginMethodDelegates } from '../../../../../../src/extension/graphView/provider/source/delegates/plugin';

function createOwner() {
  const pluginMethods = {
    _sendGraphControls: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    _sendPluginExporters: vi.fn(),
    _sendPluginToolbarActions: vi.fn(),
    _sendGraphViewContributionStatuses: vi.fn(),
    _sendPluginWebviewInjections: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
  };

  return {
    _methodContainers: {
      plugin: pluginMethods,
    },
  } as const;
}

describe('graphView/provider/source/delegates/plugin', () => {
  it('creates delegates for every plugin method container entry', () => {
    const owner = createOwner();
    const delegates = createGraphViewProviderPluginMethodDelegates(owner as never);

    delegates._sendGraphControls();
    delegates._sendPluginStatuses();
    delegates._sendDecorations();
    delegates._sendContextMenuItems();
    delegates._sendPluginExporters();
    delegates._sendPluginToolbarActions();
    delegates._sendGraphViewContributionStatuses();
    delegates._sendPluginWebviewInjections();
    delegates._sendGroupsUpdated();

    expect(owner._methodContainers.plugin._sendGraphControls).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendDecorations).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginExporters).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});
