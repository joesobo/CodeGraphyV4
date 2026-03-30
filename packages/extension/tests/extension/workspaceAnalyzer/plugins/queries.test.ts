import { describe, expect, it, vi } from 'vitest';
import {
  getWorkspaceAnalyzerPluginNameForFile,
  getWorkspaceAnalyzerPluginStatuses,
  resolveWorkspaceAnalyzerPluginNameForFile,
} from '../../../../src/extension/workspaceAnalyzer/plugins/queries';

describe('workspaceAnalyzer/plugins/queries', () => {
  it('builds plugin statuses from analyzer state', () => {
    const list = vi.fn(() => [
      {
        builtIn: true,
        plugin: {
          id: 'plugin.typescript',
          name: 'TypeScript',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          supportedExtensions: ['.ts'],
          rules: [],
        },
      },
    ]);

    expect(
      getWorkspaceAnalyzerPluginStatuses({
        disabledPlugins: new Set<string>(),
        disabledRules: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }] as never,
        fileConnections: new Map([['src/index.ts', []]]),
        registry: {
          getPluginForFile: vi.fn(() => ({ name: 'TypeScript' })),
          list,
        } as never,
        workspaceRoot: '/workspace',
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        status: 'installed',
      }),
    ]);
    expect(list).toHaveBeenCalledOnce();
  });

  it('returns undefined for plugin names when no workspace root is available', () => {
    const getPluginForFile = vi.fn();

    expect(
      resolveWorkspaceAnalyzerPluginNameForFile(
        'src/index.ts',
        '',
        () => undefined,
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('resolves plugin names from the current workspace root when no cached root exists', () => {
    const getWorkspaceRoot = vi.fn(() => '/workspace');
    const getPluginForFile = vi.fn(() => ({ name: 'TypeScript' }));

    expect(
      resolveWorkspaceAnalyzerPluginNameForFile(
        'src/index.ts',
        '',
        getWorkspaceRoot,
        { getPluginForFile } as never,
      ),
    ).toBe('TypeScript');
    expect(getWorkspaceRoot).toHaveBeenCalledOnce();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('prefers the cached workspace root when resolving plugin names', () => {
    const getWorkspaceRoot = vi.fn(() => '/other');
    const getPluginForFile = vi.fn(() => ({ name: 'TypeScript' }));

    expect(
      resolveWorkspaceAnalyzerPluginNameForFile(
        'src/index.ts',
        '/workspace',
        getWorkspaceRoot,
        { getPluginForFile } as never,
      ),
    ).toBe('TypeScript');
    expect(getWorkspaceRoot).not.toHaveBeenCalled();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('returns undefined when the resolved plugin lookup has no match', () => {
    const getPluginForFile = vi.fn(() => undefined);

    expect(
      getWorkspaceAnalyzerPluginNameForFile(
        'src/index.ts',
        '/workspace',
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });
});
