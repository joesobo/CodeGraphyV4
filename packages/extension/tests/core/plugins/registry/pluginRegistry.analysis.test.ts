import { describe, expect, it, vi } from 'vitest';
import type { IConnection } from '@/core/plugins/types/contracts';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry analysis', () => {
  it('calls detectConnections on the appropriate plugin', async () => {
    const registry = createConfiguredRegistry();
    const connections: IConnection[] = [
      { specifier: './utils', resolvedPath: '/src/utils.ts', type: 'static' },
    ];
    const plugin = createMockPlugin({
      supportedExtensions: ['.ts'],
      detectConnections: vi.fn().mockResolvedValue(connections),
    });

    registry.register(plugin);

    const result = await registry.analyzeFile('/src/app.ts', 'content', '/workspace');

    expect(plugin.detectConnections).toHaveBeenCalledWith(
      '/src/app.ts',
      'content',
      '/workspace'
    );
    expect(result).toEqual(connections);
  });

  it('returns empty array for unsupported file', async () => {
    const registry = createConfiguredRegistry();

    await expect(registry.analyzeFile('/src/styles.css', 'content', '/workspace')).resolves.toEqual([]);
  });

  it('returns empty array on plugin error', async () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({
      supportedExtensions: ['.ts'],
      detectConnections: vi.fn().mockRejectedValue(new Error('Parse error')),
    });

    registry.register(plugin);

    const result = await registry.analyzeFile('/src/app.ts', 'content', '/workspace');

    expect(result).toEqual([]);
  });
});
