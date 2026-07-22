import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry access', () => {
  it('reports plugin availability through registered access providers', async () => {
    const registry = createConfiguredRegistry();
    const getAccess = vi.fn(async ({ access, pluginId, workspaceRoot }) => ({
      access,
      reason: `${pluginId}:${workspaceRoot}`,
      state: 'granted' as const,
    }));
    registry.register(createMockPlugin({
      id: 'pro-plugin',
      accessProvider: {
        id: 'pro-access',
        provides: ['pro'],
        getAccess,
      },
      requiresAccess: 'pro',
    }));

    await expect(registry.getPluginAvailability('missing')).resolves.toBeUndefined();
    await expect(registry.getPluginAvailability('pro-plugin', { workspaceRoot: '/workspace' })).resolves.toEqual({
      pluginId: 'pro-plugin',
      available: true,
      access: [{
        access: 'pro',
        reason: 'pro-plugin:/workspace',
        state: 'granted',
      }],
    });
    expect(getAccess).toHaveBeenCalledWith({
      access: 'pro',
      pluginId: 'pro-plugin',
      workspaceRoot: '/workspace',
    });
  });
});
