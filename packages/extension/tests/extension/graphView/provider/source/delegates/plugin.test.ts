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
    _sendPluginWebviewInjections: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    registerExternalPlugin: vi.fn(async (plugin, options) => ({ plugin, options })),
  };

  return {
    _methodContainers: {
      plugin: pluginMethods,
    },
  } as const;
}

describe('graphView/provider/source/delegates/plugin', () => {
  it('creates delegates for every plugin method container entry', async () => {
    const owner = createOwner();
    const delegates = createGraphViewProviderPluginMethodDelegates(owner as never);
    const plugin = { id: 'external.plugin' };
    const options = { extensionUri: '/extension' };

    delegates._sendGraphControls();
    delegates._sendPluginStatuses();
    delegates._sendDecorations();
    delegates._sendContextMenuItems();
    delegates._sendPluginExporters();
    delegates._sendPluginToolbarActions();
    delegates._sendPluginWebviewInjections();
    delegates._sendGroupsUpdated();
    const registration = await delegates.registerExternalPlugin(plugin as never, options as never);

    expect(owner._methodContainers.plugin._sendGraphControls).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendDecorations).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginExporters).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(owner._methodContainers.plugin.registerExternalPlugin).toHaveBeenCalledWith(
      plugin,
      options,
    );
    expect(registration).toEqual({ plugin, options });
  });
});
