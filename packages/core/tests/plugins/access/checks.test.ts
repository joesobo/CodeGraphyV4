import { describe, expect, it } from 'vitest';

import { CorePluginRegistry } from '../../../src';
import type { CodeGraphyAccessKey, IPlugin } from '@codegraphy-dev/plugin-api';

function createPlugin(overrides: Partial<IPlugin>): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [],
    ...overrides,
  };
}

describe('Core plugin Access checks', () => {
  it('keeps Access Provider plugins available while hiding gated plugin contributions without granted Access', async () => {
    const paidFeatureAccess = 'premium-layout' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'codegraphy.pro',
      accessProvider: {
        id: 'codegraphy.pro.access',
        provides: [paidFeatureAccess],
        async getAccess() {
          return {
            access: paidFeatureAccess,
            state: 'missing',
            reason: 'Sign in to CodeGraphy Pro.',
          };
        },
      },
      graphView: {
        ui: [{
          id: 'codegraphy.pro.account',
          label: 'Account',
          slot: 'graph.toolbar',
          view: { kind: 'command', command: 'codegraphy.pro.account' },
        }],
      },
    }));

    registry.register(createPlugin({
      id: 'acme.premium-layout',
      requiresAccess: paidFeatureAccess,
      graphView: {
        forces: [{
          id: 'acme.premium-layout.force',
          label: 'Premium Layout Force',
          create() {
            return { dispose() {} };
          },
        }],
      },
    }));

    await expect(registry.getPluginAvailability('codegraphy.pro')).resolves.toMatchObject({
      pluginId: 'codegraphy.pro',
      available: true,
      access: [],
    });
    await expect(registry.getPluginAvailability('acme.premium-layout')).resolves.toMatchObject({
      pluginId: 'acme.premium-layout',
      available: false,
      access: [{
        access: paidFeatureAccess,
        state: 'missing',
      }],
    });
    await expect(registry.listAvailableGraphViewContributions()).resolves.toMatchObject({
      ui: [{
        pluginId: 'codegraphy.pro',
        contribution: { id: 'codegraphy.pro.account' },
      }],
      forces: [],
    });
  });

  it('exposes gated plugin contributions when an Access Provider grants Access', async () => {
    const paidFeatureAccess = 'premium-layout' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'codegraphy.pro',
      accessProvider: {
        id: 'codegraphy.pro.access',
        provides: [paidFeatureAccess],
        async getAccess() {
          return {
            access: paidFeatureAccess,
            state: 'granted',
          };
        },
      },
    }));

    registry.register(createPlugin({
      id: 'acme.premium-layout',
      requiresAccess: paidFeatureAccess,
      graphView: {
        forces: [{
          id: 'acme.premium-layout.force',
          label: 'Premium Layout Force',
          create() {
            return { dispose() {} };
          },
        }],
      },
    }));

    await expect(registry.getPluginAvailability('acme.premium-layout')).resolves.toMatchObject({
      pluginId: 'acme.premium-layout',
      available: true,
      access: [{
        access: paidFeatureAccess,
        state: 'granted',
      }],
    });
    await expect(registry.listAvailableGraphViewContributions()).resolves.toMatchObject({
      forces: [{
        pluginId: 'acme.premium-layout',
        contribution: { id: 'acme.premium-layout.force' },
      }],
    });
  });
});
