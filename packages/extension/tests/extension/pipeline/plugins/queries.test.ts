import { describe, expect, it, vi } from 'vitest';
import {
  getWorkspacePipelinePluginNameForFile,
  getWorkspacePipelinePluginStatuses,
  resolveWorkspacePipelinePluginNameForFile,
} from '../../../../src/extension/pipeline/plugins/queries';

describe('pipeline/plugins/queries', () => {
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
          sources: [],
        },
      },
    ]);

    expect(
      getWorkspacePipelinePluginStatuses({
        disabledPlugins: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }] as never,
        fileConnections: new Map([['src/index.ts', []]]),
        registry: {
          getPluginForFile: vi.fn(() => ({ name: 'TypeScript' })),
          list,
        } as never,
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
      resolveWorkspacePipelinePluginNameForFile(
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
      resolveWorkspacePipelinePluginNameForFile(
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
      resolveWorkspacePipelinePluginNameForFile(
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
      getWorkspacePipelinePluginNameForFile(
        'src/index.ts',
        '/workspace',
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });
});
