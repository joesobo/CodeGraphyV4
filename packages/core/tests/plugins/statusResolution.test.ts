import { describe, expect, it, vi } from 'vitest';
import {
  getWorkspaceIndexPluginMatchingFiles,
  getWorkspaceIndexPluginNameForFile,
  resolveWorkspaceIndexPluginNameForFile,
  supportsWorkspaceIndexPluginExtension,
} from '../../src';

describe('plugins/status resolution', () => {
  it('returns undefined for plugin names when no workspace root is available', () => {
    const getPluginForFile = vi.fn();

    expect(
      resolveWorkspaceIndexPluginNameForFile(
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
      resolveWorkspaceIndexPluginNameForFile(
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
      resolveWorkspaceIndexPluginNameForFile(
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
      getWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '/workspace',
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('matches plugin files case-insensitively for targeted refreshes', () => {
    expect(supportsWorkspaceIndexPluginExtension(['.TS'], '.ts')).toBe(true);
    expect(
      getWorkspaceIndexPluginMatchingFiles(
        { plugin: { supportedExtensions: ['.TS'] } },
        [
          { relativePath: 'src/app.ts' },
          { relativePath: 'README.md' },
        ],
      ),
    ).toEqual([{ relativePath: 'src/app.ts' }]);
  });
});
