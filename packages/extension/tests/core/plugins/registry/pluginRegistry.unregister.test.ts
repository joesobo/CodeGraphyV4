import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry unregister', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unregisters a plugin', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin();

    registry.register(plugin);

    const result = registry.unregister(plugin.id);

    expect(result).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.get(plugin.id)).toBeUndefined();
  });

  it('returns false for non-existent plugin', () => {
    const registry = createConfiguredRegistry();

    expect(registry.unregister('non.existent')).toBe(false);
  });

  it('calls onUnload on the plugin', () => {
    const registry = createConfiguredRegistry();
    const onUnload = vi.fn();
    const plugin = createMockPlugin({ onUnload });

    registry.register(plugin);
    registry.unregister(plugin.id);

    expect(onUnload).toHaveBeenCalled();
  });

  it('leaves no registered external handle active after unload', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin();
    const dispose = vi.fn();
    registry.register(plugin);
    registry.getPluginAPI(plugin.id)?.registerDisposable({ dispose });

    registry.unregister(plugin.id);

    expect(dispose).toHaveBeenCalledOnce();
  });

  it('removes plugin from extension map', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });

    registry.register(plugin);
    expect(registry.supportsFile('app.ts')).toBe(true);

    registry.unregister(plugin.id);

    expect(registry.supportsFile('app.ts')).toBe(false);
  });

  it('does not log core-only built-ins as user-facing plugin unregistrations', () => {
    const registry = createConfiguredRegistry();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const plugin = createMockPlugin({
      id: 'test.plugin',
      name: 'Test Plugin',
    });

    registry.register(plugin, { builtIn: true });
    logSpy.mockClear();

    registry.unregister(plugin.id);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Unregistered plugin: test.plugin'),
    );
  });
});
