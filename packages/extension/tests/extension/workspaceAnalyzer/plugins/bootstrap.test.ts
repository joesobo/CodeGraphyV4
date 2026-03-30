import { describe, expect, it, vi } from 'vitest';
import {
  getWorkspaceAnalyzerPluginFilterPatterns,
  initializeWorkspaceAnalyzer,
} from '../../../../src/extension/workspaceAnalyzer/plugins/bootstrap';

function createRegistry() {
  return {
    initializeAll: vi.fn(async () => undefined),
    register: vi.fn(),
  };
}

describe('workspaceAnalyzer/plugins/bootstrap', () => {
  it('collects unique plugin filter patterns and skips plugins without defaults', () => {
    expect(
      getWorkspaceAnalyzerPluginFilterPatterns({
        list: () => [
          { plugin: { defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
          { plugin: {} },
          { plugin: { defaultFilters: ['**/*.generated.ts'] } },
        ],
      }),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('registers built-in plugins and initializes them when a workspace root exists', async () => {
    const registry = createRegistry();

    await initializeWorkspaceAnalyzer(registry as never, {
      getWorkspaceRoot: () => '/workspace',
    });

    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.register.mock.calls.map(([, options]) => options)).toEqual([{ builtIn: true }]);
    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith('/workspace');
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    const registry = createRegistry();

    await initializeWorkspaceAnalyzer(registry as never, {
      getWorkspaceRoot: () => undefined,
    });

    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.initializeAll).not.toHaveBeenCalled();
  });
});
