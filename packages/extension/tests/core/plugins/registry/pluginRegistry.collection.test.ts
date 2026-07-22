import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry collection', () => {
  it('returns all registered plugins', () => {
    const registry = createConfiguredRegistry();
    const plugin1 = createMockPlugin({ id: 'first' });
    const plugin2 = createMockPlugin({ id: 'second' });

    registry.register(plugin1);
    registry.register(plugin2);

    const result = registry.list();

    expect(result).toHaveLength(2);
    expect(result.map((pluginInfo) => pluginInfo.plugin.id)).toContain('first');
    expect(result.map((pluginInfo) => pluginInfo.plugin.id)).toContain('second');
  });

  it('exposes plugin lookup, size, api, and file support helpers from the collection surface', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
    });

    registry.register(plugin);

    expect(registry.get('typescript')?.plugin).toBe(plugin);
    expect(registry.size).toBe(1);
    expect(registry.getPluginAPI('typescript')).toEqual(
      expect.objectContaining({ version: '3.0.0' }),
    );
    expect(registry.supportsFile('src/app.ts')).toBe(true);
    expect(registry.supportsFile('src/app.py')).toBe(false);
  });

  it('returns empty array when no plugins are registered', () => {
    const registry = createConfiguredRegistry();

    expect(registry.list()).toEqual([]);
  });

  it('returns all supported extensions', () => {
    const registry = createConfiguredRegistry();
    const plugin1 = createMockPlugin({ id: 'ts', supportedExtensions: ['.ts', '.tsx'] });
    const plugin2 = createMockPlugin({ id: 'js', supportedExtensions: ['.js'] });

    registry.register(plugin1);
    registry.register(plugin2);

    expect(registry.getSupportedExtensions()).toEqual(expect.arrayContaining(['.ts', '.tsx', '.js']));
  });

  it('returns empty extension list when no plugins are registered', () => {
    const registry = createConfiguredRegistry();

    expect(registry.getSupportedExtensions()).toEqual([]);
  });

  it('disposes every registered plugin through unregister', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'first' }));
    registry.register(createMockPlugin({ id: 'second' }));
    const unregisterSpy = vi.spyOn(registry, 'unregister');

    registry.disposeAll();

    expect(unregisterSpy).toHaveBeenCalledTimes(2);
    expect(unregisterSpy).toHaveBeenNthCalledWith(1, 'first');
    expect(unregisterSpy).toHaveBeenNthCalledWith(2, 'second');
    expect(registry.size).toBe(0);
  });

  it('replays readiness only for a known deferred plugin', () => {
    const registry = createConfiguredRegistry();
    const readyGraph = { nodes: [{ id: 'graph', label: 'graph', color: '#fff' }], edges: [] };
    const plugin = createMockPlugin({
      id: 'late',
      onWorkspaceReady: vi.fn(),
      onWebviewReady: vi.fn(),
    });

    registry.notifyWorkspaceReady(readyGraph);
    registry.notifyWebviewReady();
    registry.register(plugin, { deferReadinessReplay: true });

    registry.replayReadinessForPlugin('missing');
    registry.replayReadinessForPlugin('late');

    expect(plugin.onWorkspaceReady).toHaveBeenCalledOnce();
    expect(plugin.onWorkspaceReady).toHaveBeenCalledWith(readyGraph);
    expect(plugin.onWebviewReady).toHaveBeenCalledOnce();
  });
});
