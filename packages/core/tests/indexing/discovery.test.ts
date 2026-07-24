import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INCLUDE } from '../../src/discovery/file/defaults';
import type { FileDiscovery } from '../../src/discovery/file/service';
import { discoverWorkspaceIndexFiles } from '../../src/indexing/discovery';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsDefaults';

describe('indexing/discovery', () => {
  it('excludes active custom filters from fresh indexing', async () => {
    const discover = vi.fn(async () => ({
      files: [],
      presentFilePaths: ['generated/cache.ts'],
      directories: ['src'],
      durationMs: 12,
      limitReached: true,
      totalFound: 101,
      gitIgnoredPaths: ['generated/cache.ts'],
    }));
    const warn = vi.fn();
    const logInfo = vi.fn();
    const signal = new AbortController().signal;

    await expect(discoverWorkspaceIndexFiles({
      discovery: { discover } as unknown as FileDiscovery,
      options: { workspaceRoot: '/workspace', warn, logInfo, signal },
      pluginFilterPatterns: ['**/.cache/**'],
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        include: [],
        maxFiles: 50,
        filterPatterns: ['**/generated/**', '**/dist/**'],
        disabledCustomFilterPatterns: ['**/dist/**'],
        plugins: [{
          id: 'codegraphy.test',
          activation: 'enabled',
          disabledFilterPatterns: ['**/ignored/**'],
        }],
      },
      workspaceRoot: '/workspace',
    })).resolves.toMatchObject({
      directories: ['src'],
      gitIgnoredPaths: ['generated/cache.ts'],
      limitReached: true,
      totalFound: 101,
    });

    expect(discover).toHaveBeenCalledWith({
      rootPath: '/workspace',
      include: DEFAULT_INCLUDE,
      exclude: [],
      filter: ['**/generated/**', '**/.cache/**'],
      maxFiles: 50,
      respectGitignore: true,
      signal,
    });
    expect(warn).toHaveBeenCalledWith(
      'CodeGraphy: Found 101 files, showing first 50. Increase maxFiles in .codegraphy/settings.json to see more.',
    );
    expect(logInfo).toHaveBeenCalledWith('[CodeGraphy] Discovered 0 files in 12ms');
  });

  it('uses explicit include patterns and skips optional callbacks when the limit is not reached', async () => {
    const discover = vi.fn(async () => ({
      files: [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts' }],
      presentFilePaths: ['src/app.ts'],
      durationMs: 3,
      limitReached: false,
    }));

    const result = await discoverWorkspaceIndexFiles({
      discovery: { discover } as unknown as FileDiscovery,
      options: { workspaceRoot: '/workspace' },
      pluginFilterPatterns: [],
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        include: ['src/**/*.ts'],
        respectGitignore: false,
      },
      workspaceRoot: '/workspace',
    });

    expect(result).toMatchObject({
      files: [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts' }],
    });
    expect(result).not.toHaveProperty('totalFound');

    expect(discover).toHaveBeenCalledWith(expect.objectContaining({
      include: ['src/**/*.ts'],
      respectGitignore: false,
    }));
  });
});
