import { describe, expect, it, vi } from 'vitest';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from '../../../../src/extension/pipeline/plugins/bootstrap';

function createRegistry() {
  return {
    initializeAll: vi.fn(async () => undefined),
    register: vi.fn(),
  };
}

describe('pipeline/plugins/bootstrap', () => {
  it('collects unique plugin filter patterns and skips plugins without defaults', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns({
        list: () => [
          { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
          { plugin: {} },
          { plugin: { id: 'plugin.disabled', defaultFilters: ['**/*.generated.ts'] } },
        ] as Array<{ plugin: { id?: string; defaultFilters?: string[] } }>,
      }),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('skips default filter patterns contributed by disabled plugins', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns(
        {
          list: () => [
            { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
            { plugin: { id: 'plugin.disabled', defaultFilters: ['venv/**', '**/*.generated.ts'] } },
          ],
        },
        new Set(['plugin.disabled']),
      ),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('registers built-in plugins and initializes them when a workspace root exists', async () => {
    const registry = createRegistry();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => '/workspace',
    });

    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.register.mock.calls.map(([, options]) => options)).toEqual([
      { builtIn: true },
      { builtIn: true },
    ]);
    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown', 'codegraphy.treesitter']);
    expect(registry.initializeAll).toHaveBeenCalledWith('/workspace');
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    const registry = createRegistry();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => undefined,
    });

    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.initializeAll).not.toHaveBeenCalled();
  });
});
