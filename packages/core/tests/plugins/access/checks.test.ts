import { describe, expect, it } from 'vitest';

import { CorePluginRegistry } from '../../../src';
import type { CodeGraphyAccessKey, IPlugin } from '@codegraphy-dev/plugin-api';

function createPlugin(overrides: Partial<IPlugin>): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: [],
    ...overrides,
  };
}

describe('Core plugin Access checks', () => {
  it('keeps Access Provider plugins available while hiding gated plugin contributions without granted Access', async () => {
    const paidFeatureAccess = 'premium-layout' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'acme.account',
      accessProvider: {
        id: 'acme.account.access',
        provides: [paidFeatureAccess],
        async getAccess() {
          return {
            access: paidFeatureAccess,
            state: 'missing',
            reason: 'Sign in through the account portal.',
          };
        },
      },
      graphView: {
        ui: [{
          id: 'acme.account.toolbar',
          label: 'Account',
          slot: 'graph.toolbar',
          view: { kind: 'command', command: 'acme.account.toggle' },
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

    await expect(registry.getPluginAvailability('acme.account')).resolves.toMatchObject({
      pluginId: 'acme.account',
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
        pluginId: 'acme.account',
        contribution: { id: 'acme.account.toolbar' },
      }],
      forces: [],
    });
  });

  it('exposes gated plugin contributions when an Access Provider grants Access', async () => {
    const paidFeatureAccess = 'premium-layout' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'acme.account',
      accessProvider: {
        id: 'acme.account.access',
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
