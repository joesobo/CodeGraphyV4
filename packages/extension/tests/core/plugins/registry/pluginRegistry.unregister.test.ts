import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry unregister', () => {
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

  it('removes plugin from extension map', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });

    registry.register(plugin);
    expect(registry.supportsFile('app.ts')).toBe(true);

    registry.unregister(plugin.id);

    expect(registry.supportsFile('app.ts')).toBe(false);
  });
});
