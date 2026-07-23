import { describe, expect, it, vi } from 'vitest';
import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import { WorkspacePluginRegistry } from '../../../../src/extension/pipeline/plugins/registry';

describe('WorkspacePluginRegistry', () => {
  it('composes Extension lifecycle behavior outside the Core registry', async () => {
    const onWebviewReady = vi.fn();
    const onUnload = vi.fn();
    const plugin: IExtensionPlugin = {
      id: 'acme.extension',
      name: 'Extension plugin',
      version: '1.0.0',
      apiVersion: '^1.0.0',
      onWebviewReady,
      onUnload,
    };
    const registry = new WorkspacePluginRegistry();

    expect(new PluginRegistry()).not.toHaveProperty('extensionPlugins');

    registry.extensionPlugins.register(plugin);
    await registry.extensionPlugins.initializeAll('/workspace');
    registry.notifyWebviewReady();
    registry.disposeAll();

    expect(onWebviewReady).toHaveBeenCalledOnce();
    expect(onUnload).toHaveBeenCalledOnce();
  });
});
