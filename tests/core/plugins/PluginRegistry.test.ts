import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginRegistry, IPlugin, IConnection } from '../../../src/core/plugins';

// Helper to create a mock plugin
function createMockPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    supportedExtensions: ['.test'],
    detectConnections: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const plugin = createMockPlugin();
      registry.register(plugin);

      expect(registry.size).toBe(1);
      expect(registry.get(plugin.id)).toBeDefined();
    });

    it('should register plugin as built-in when specified', () => {
      const plugin = createMockPlugin();
      registry.register(plugin, { builtIn: true });

      const info = registry.get(plugin.id);
      expect(info?.builtIn).toBe(true);
    });

    it('should register plugin with source extension', () => {
      const plugin = createMockPlugin();
      registry.register(plugin, { sourceExtension: 'codegraphy-rust' });

      const info = registry.get(plugin.id);
      expect(info?.sourceExtension).toBe('codegraphy-rust');
    });

    it('should throw if plugin ID already exists', () => {
      const plugin = createMockPlugin();
      registry.register(plugin);

      expect(() => registry.register(plugin)).toThrow(
        "Plugin with ID 'test.plugin' is already registered"
      );
    });

    it('should handle extensions with and without dots', () => {
      const plugin = createMockPlugin({
        supportedExtensions: ['ts', '.tsx'],
      });
      registry.register(plugin);

      expect(registry.supportsFile('app.ts')).toBe(true);
      expect(registry.supportsFile('app.tsx')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a plugin', () => {
      const plugin = createMockPlugin();
      registry.register(plugin);

      const result = registry.unregister(plugin.id);

      expect(result).toBe(true);
      expect(registry.size).toBe(0);
      expect(registry.get(plugin.id)).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const result = registry.unregister('non.existent');
      expect(result).toBe(false);
    });

    it('should call dispose on the plugin', () => {
      const dispose = vi.fn();
      const plugin = createMockPlugin({ dispose });
      registry.register(plugin);

      registry.unregister(plugin.id);

      expect(dispose).toHaveBeenCalled();
    });

    it('should remove plugin from extension map', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      expect(registry.supportsFile('app.ts')).toBe(true);

      registry.unregister(plugin.id);

      expect(registry.supportsFile('app.ts')).toBe(false);
    });
  });

  describe('getPluginForFile', () => {
    it('should return plugin for supported file', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      const result = registry.getPluginForFile('src/app.ts');

      expect(result).toBe(plugin);
    });

    it('should return undefined for unsupported file', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      const result = registry.getPluginForFile('styles.css');

      expect(result).toBeUndefined();
    });

    it('should return first plugin when multiple support same extension', () => {
      const plugin1 = createMockPlugin({ id: 'first', supportedExtensions: ['.ts'] });
      const plugin2 = createMockPlugin({ id: 'second', supportedExtensions: ['.ts'] });
      registry.register(plugin1);
      registry.register(plugin2);

      const result = registry.getPluginForFile('app.ts');

      expect(result).toBe(plugin1);
    });

    it('should handle case-insensitive extensions', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      expect(registry.getPluginForFile('app.TS')).toBe(plugin);
      expect(registry.getPluginForFile('app.Ts')).toBe(plugin);
    });
  });

  describe('getPluginsForExtension', () => {
    it('should return all plugins for an extension', () => {
      const plugin1 = createMockPlugin({ id: 'first', supportedExtensions: ['.ts'] });
      const plugin2 = createMockPlugin({ id: 'second', supportedExtensions: ['.ts'] });
      registry.register(plugin1);
      registry.register(plugin2);

      const result = registry.getPluginsForExtension('.ts');

      expect(result).toHaveLength(2);
      expect(result).toContain(plugin1);
      expect(result).toContain(plugin2);
    });

    it('should return empty array for unsupported extension', () => {
      const result = registry.getPluginsForExtension('.xyz');
      expect(result).toEqual([]);
    });

    it('should handle extension without leading dot', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      const result = registry.getPluginsForExtension('ts');

      expect(result).toContain(plugin);
    });
  });

  describe('analyzeFile', () => {
    it('should call detectConnections on the appropriate plugin', async () => {
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

    it('should return empty array for unsupported file', async () => {
      const result = await registry.analyzeFile('/src/styles.css', 'content', '/workspace');
      expect(result).toEqual([]);
    });

    it('should return empty array on plugin error', async () => {
      const plugin = createMockPlugin({
        supportedExtensions: ['.ts'],
        detectConnections: vi.fn().mockRejectedValue(new Error('Parse error')),
      });
      registry.register(plugin);

      const result = await registry.analyzeFile('/src/app.ts', 'content', '/workspace');

      expect(result).toEqual([]);
    });
  });

  describe('list', () => {
    it('should return all registered plugins', () => {
      const plugin1 = createMockPlugin({ id: 'first' });
      const plugin2 = createMockPlugin({ id: 'second' });
      registry.register(plugin1, { builtIn: true });
      registry.register(plugin2, { builtIn: false });

      const result = registry.list();

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.plugin.id)).toContain('first');
      expect(result.map((p) => p.plugin.id)).toContain('second');
    });

    it('should return empty array when no plugins registered', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return all supported extensions', () => {
      const plugin1 = createMockPlugin({ id: 'ts', supportedExtensions: ['.ts', '.tsx'] });
      const plugin2 = createMockPlugin({ id: 'js', supportedExtensions: ['.js'] });
      registry.register(plugin1);
      registry.register(plugin2);

      const result = registry.getSupportedExtensions();

      expect(result).toContain('.ts');
      expect(result).toContain('.tsx');
      expect(result).toContain('.js');
    });
  });

  describe('supportsFile', () => {
    it('should return true for supported file', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      expect(registry.supportsFile('app.ts')).toBe(true);
    });

    it('should return false for unsupported file', () => {
      expect(registry.supportsFile('app.ts')).toBe(false);
    });

    it('should return false for file without extension', () => {
      const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
      registry.register(plugin);

      expect(registry.supportsFile('Makefile')).toBe(false);
    });
  });

  describe('initializeAll', () => {
    it('should call initialize on all plugins', async () => {
      const init1 = vi.fn().mockResolvedValue(undefined);
      const init2 = vi.fn().mockResolvedValue(undefined);
      const plugin1 = createMockPlugin({ id: 'first', initialize: init1 });
      const plugin2 = createMockPlugin({ id: 'second', initialize: init2 });
      registry.register(plugin1);
      registry.register(plugin2);

      await registry.initializeAll('/workspace');

      expect(init1).toHaveBeenCalledWith('/workspace');
      expect(init2).toHaveBeenCalledWith('/workspace');
    });

    it('should continue if one plugin fails to initialize', async () => {
      const init1 = vi.fn().mockRejectedValue(new Error('Init failed'));
      const init2 = vi.fn().mockResolvedValue(undefined);
      const plugin1 = createMockPlugin({ id: 'first', initialize: init1 });
      const plugin2 = createMockPlugin({ id: 'second', initialize: init2 });
      registry.register(plugin1);
      registry.register(plugin2);

      await registry.initializeAll('/workspace');

      expect(init2).toHaveBeenCalled();
    });
  });

  describe('disposeAll', () => {
    it('should dispose and remove all plugins', () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();
      const plugin1 = createMockPlugin({ id: 'first', dispose: dispose1 });
      const plugin2 = createMockPlugin({ id: 'second', dispose: dispose2 });
      registry.register(plugin1);
      registry.register(plugin2);

      registry.disposeAll();

      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
      expect(registry.size).toBe(0);
    });
  });
});
