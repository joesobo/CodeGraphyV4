import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INCLUDE } from '../../src/discovery/file/defaults';
import type { FileDiscovery } from '../../src/discovery/file/service';
import { discoverWorkspaceIndexFiles } from '../../src/indexing/discovery';
import type { CorePluginRegistry } from '../../src/plugins/registry';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsDefaults';

describe('indexing/discovery', () => {
  it('discovers workspace files with plugin filters, disabled filter overrides, and user filters', async () => {
    const discover = vi.fn(async () => ({
      files: [],
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
      disabledPlugins: new Set(['disabled-plugin']),
      discovery: { discover } as unknown as FileDiscovery,
      options: { workspaceRoot: '/workspace', warn, logInfo, signal },
      registry: {
        getPluginFilterPatterns: vi.fn(() => ['**/dist/**', '**/ignored/**', '**/dist/**']),
      } as unknown as CorePluginRegistry,
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        include: [],
        maxFiles: 50,
        filterPatterns: ['**/generated/**', '**/dist/**'],
        plugins: [{
          id: 'codegraphy.test',
          enabled: true,
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
      exclude: ['**/dist/**', '**/generated/**'],
      maxFiles: 50,
      respectGitignore: true,
      signal,
    });
    expect(warn).toHaveBeenCalledWith(
      'CodeGraphy: Found 101+ files, showing first 50. Increase maxFiles in .codegraphy/settings.json to see more.',
    );
    expect(logInfo).toHaveBeenCalledWith('[CodeGraphy] Discovered 0 files in 12ms');
  });

  it('uses explicit include patterns and skips optional callbacks when the limit is not reached', async () => {
    const discover = vi.fn(async () => ({
      files: [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts' }],
      durationMs: 3,
      limitReached: false,
    }));

    const result = await discoverWorkspaceIndexFiles({
      disabledPlugins: new Set(),
      discovery: { discover } as unknown as FileDiscovery,
      options: { workspaceRoot: '/workspace' },
      registry: {
        getPluginFilterPatterns: vi.fn(() => []),
      } as unknown as CorePluginRegistry,
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
