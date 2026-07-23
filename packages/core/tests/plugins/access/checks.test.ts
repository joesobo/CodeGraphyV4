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
  it('keeps Access Provider plugins available while denying a gated Core plugin', async () => {
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
    }));

    registry.register(createPlugin({
      id: 'acme.premium-layout',
      requiresAccess: paidFeatureAccess,
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
  });

  it('exposes a gated Core plugin when an Access Provider grants Access', async () => {
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
    }));

    await expect(registry.getPluginAvailability('acme.premium-layout')).resolves.toMatchObject({
      pluginId: 'acme.premium-layout',
      available: true,
      access: [{
        access: paidFeatureAccess,
        state: 'granted',
      }],
    });
  });
});
