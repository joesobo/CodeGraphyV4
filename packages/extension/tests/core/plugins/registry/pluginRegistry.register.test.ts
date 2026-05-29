import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry register', () => {
  let registry = createConfiguredRegistry();

  beforeEach(() => {
    registry = createConfiguredRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a plugin', () => {
    const plugin = createMockPlugin();

    registry.register(plugin);

    expect(registry.size).toBe(1);
    expect(registry.get(plugin.id)).toBeDefined();
  });

  it('registers plugin as built-in when specified', () => {
    const plugin = createMockPlugin();

    registry.register(plugin, { builtIn: true });

    expect(registry.get(plugin.id)?.builtIn).toBe(true);
  });

  it('does not log core-only built-ins as user-facing plugin registrations', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const plugin = createMockPlugin({
      id: 'codegraphy.treesitter',
      name: 'Tree-sitter',
    });

    registry.register(plugin, { builtIn: true });

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Registered plugin: Tree-sitter'),
    );
  });

  it('defaults builtIn to false when omitted', () => {
    const plugin = createMockPlugin();

    registry.register(plugin);

    expect(registry.get(plugin.id)?.builtIn).toBe(false);
  });

  it('registers plugin with source extension', () => {
    const plugin = createMockPlugin();

    registry.register(plugin, { sourceExtension: 'codegraphy-rust' });

    expect(registry.get(plugin.id)?.sourceExtension).toBe('codegraphy-rust');
  });

  it('throws if plugin ID already exists', () => {
    const plugin = createMockPlugin();

    registry.register(plugin);

    expect(() => registry.register(plugin)).toThrow(
      "Plugin with ID 'test.plugin' is already registered"
    );
  });

  it('handles extensions with and without dots', () => {
    const plugin = createMockPlugin({
      supportedExtensions: ['ts', '.tsx'],
    });

    registry.register(plugin);

    expect(registry.supportsFile('app.ts')).toBe(true);
    expect(registry.supportsFile('app.tsx')).toBe(true);
  });
});
