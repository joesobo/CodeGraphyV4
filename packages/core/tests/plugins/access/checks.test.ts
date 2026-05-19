import { describe, expect, it } from 'vitest';

import { CorePluginRegistry } from '../../../src';
import type { CodeGraphyAccessKey, IPlugin } from '@codegraphy/plugin-api';

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
    const organizeAccess = 'organize' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'codegraphy.pro',
      accessProvider: {
        id: 'codegraphy.pro.access',
        provides: [organizeAccess],
        async getAccess() {
          return {
            access: organizeAccess,
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
      id: 'codegraphy.organize',
      requiresAccess: organizeAccess,
      graphView: {
        forces: [{
          id: 'codegraphy.organize.section-physics',
          label: 'Section Physics',
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
    await expect(registry.getPluginAvailability('codegraphy.organize')).resolves.toMatchObject({
      pluginId: 'codegraphy.organize',
      available: false,
      access: [{
        access: organizeAccess,
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
    const organizeAccess = 'organize' as CodeGraphyAccessKey;
    const registry = new CorePluginRegistry();

    registry.register(createPlugin({
      id: 'codegraphy.pro',
      accessProvider: {
        id: 'codegraphy.pro.access',
        provides: [organizeAccess],
        async getAccess() {
          return {
            access: organizeAccess,
            state: 'granted',
          };
        },
      },
    }));

    registry.register(createPlugin({
      id: 'codegraphy.organize',
      requiresAccess: organizeAccess,
      graphView: {
        forces: [{
          id: 'codegraphy.organize.section-physics',
          label: 'Section Physics',
          create() {
            return { dispose() {} };
          },
        }],
      },
    }));

    await expect(registry.getPluginAvailability('codegraphy.organize')).resolves.toMatchObject({
      pluginId: 'codegraphy.organize',
      available: true,
      access: [{
        access: organizeAccess,
        state: 'granted',
      }],
    });
    await expect(registry.listAvailableGraphViewContributions()).resolves.toMatchObject({
      forces: [{
        pluginId: 'codegraphy.organize',
        contribution: { id: 'codegraphy.organize.section-physics' },
      }],
    });
  });
});
