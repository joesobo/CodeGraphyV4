import { describe, expect, it } from 'vitest';
import type { CodeGraphyAccessKey } from '@codegraphy-dev/plugin-api';
import { createProPlugin } from '../src/plugin';

describe('@codegraphy/pro plugin', () => {
  it('registers as the Pro access provider without owning paid feature implementation', () => {
    const plugin = createProPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.pro',
      name: 'CodeGraphy Pro',
      apiVersion: '^2.0.0',
      supportedExtensions: [],
    });
    expect(plugin.requiresAccess).toBeUndefined();
    expect(plugin.accessProvider?.provides).toEqual([]);
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

  it('reports configured paid feature access from the Pro account status', async () => {
    const accessKey = 'premium-layout' as CodeGraphyAccessKey;
    const plugin = createProPlugin({
      accessKeys: [accessKey],
      getAccountStatus: () => ({
        signedIn: true,
        plan: 'pro',
        access: {
          [accessKey]: 'granted',
        },
      }),
    });

    await expect(plugin.accessProvider?.getAccess({
      access: accessKey,
      pluginId: 'acme.premium-layout',
    })).resolves.toEqual({
      access: accessKey,
      state: 'granted',
    });
  });

  it('keeps configured paid feature access gated when no Pro account is connected', async () => {
    const accessKey = 'premium-layout' as CodeGraphyAccessKey;
    const plugin = createProPlugin({ accessKeys: [accessKey] });

    await expect(plugin.accessProvider?.getAccess({
      access: accessKey,
      pluginId: 'acme.premium-layout',
    })).resolves.toEqual({
      access: accessKey,
      state: 'missing',
      reason: 'CodeGraphy Pro account is not connected.',
    });
  });
});
