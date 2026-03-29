import { describe, expect, it } from 'vitest';
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
});
