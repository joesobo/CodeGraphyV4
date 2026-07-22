import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry disabled analysis', () => {
  it('excludes disabled plugins from file analysis', async () => {
    const registry = createConfiguredRegistry();
    const analyzeFile = vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    }));
    registry.register(createMockPlugin({
      id: 'plugin.disabled',
      supportedExtensions: ['.ts'],
      analyzeFile,
    }));

    await expect(
      registry.analyzeFileResult(
        '/workspace/src/app.ts',
        "import './target'",
        '/workspace',
        undefined,
        { disabledPlugins: new Set(['plugin.disabled']) },
      ),
    ).resolves.toBeNull();

    expect(analyzeFile).not.toHaveBeenCalled();
  });

  it('excludes disabled plugins from targeted file analysis', async () => {
    const registry = createConfiguredRegistry();
    const analyzeFile = vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    }));
    registry.register(createMockPlugin({
      id: 'plugin.disabled',
      supportedExtensions: ['.ts'],
      analyzeFile,
    }));

    await expect(
      registry.analyzeFileResultForPlugins(
        '/workspace/src/app.ts',
        "import './target'",
        '/workspace',
        ['plugin.disabled'],
        undefined,
        { disabledPlugins: new Set(['plugin.disabled']) },
      ),
    ).resolves.toBeNull();

    expect(analyzeFile).not.toHaveBeenCalled();
  });
});
