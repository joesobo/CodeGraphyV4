import { describe, expect, it } from 'vitest';
import { createProPlugin } from '../src/plugin';

describe('@codegraphy/pro plugin', () => {
  it('registers as the Pro access provider without owning Organize implementation', () => {
    const plugin = createProPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.pro',
      name: 'CodeGraphy Pro',
      apiVersion: '^2.0.0',
      supportedExtensions: [],
    });
    expect(plugin.requiresAccess).toBeUndefined();
    expect(plugin.accessProvider?.provides).toEqual(['organize']);
    expect(plugin.graphView?.runtimeNodes).toBeUndefined();
    expect(plugin.graphView?.projections).toBeUndefined();
    expect(plugin.graphView?.forces).toBeUndefined();
  });

  it('contributes account controls to graph.toolbar and graph.panelSlot', () => {
    const plugin = createProPlugin();

    expect(plugin.graphView?.ui).toEqual([
      expect.objectContaining({
        id: 'codegraphy.pro.account-toolbar',
        label: 'CodeGraphy Pro Account',
        slot: 'graph.toolbar',
        view: { kind: 'command', command: 'codegraphy.pro.account.toggle' },
      }),
      expect.objectContaining({
        id: 'codegraphy.pro.account-panel',
        label: 'CodeGraphy Pro Account',
        slot: 'graph.panelSlot',
        view: { kind: 'panel', panelId: 'codegraphy.pro.account' },
      }),
    ]);
  });

  it('reports organize access from the configured Pro account status', async () => {
    const plugin = createProPlugin({
      getAccountStatus: () => ({
        signedIn: true,
        plan: 'pro',
        access: {
          organize: 'granted',
        },
      }),
    });

    await expect(plugin.accessProvider?.getAccess({
      access: 'organize',
      pluginId: 'codegraphy.organize',
    })).resolves.toEqual({
      access: 'organize',
      state: 'granted',
    });
  });

  it('keeps organize gated when no Pro account is connected', async () => {
    const plugin = createProPlugin();

    await expect(plugin.accessProvider?.getAccess({
      access: 'organize',
      pluginId: 'codegraphy.organize',
    })).resolves.toEqual({
      access: 'organize',
      state: 'missing',
      reason: 'CodeGraphy Pro account is not connected.',
    });
  });
});
