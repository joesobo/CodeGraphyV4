import { describe, expect, it, vi } from 'vitest';
import { notifyFilesChanged } from '../../../../../src/core/plugins/lifecycle/notify/filesChanged';
import type { IPlugin } from '../../../../../src/core/plugins/types/contracts';

function makePlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;
}

describe('plugin lifecycle notify/filesChanged', () => {
  it('passes the analysis context to change hooks', async () => {
    const onFilesChanged = vi.fn().mockResolvedValue(undefined);
    const plugin = makePlugin({ onFilesChanged });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];
    const context = {
      mode: 'workspace',
      fileSystem: {
        exists: vi.fn(),
        isDirectory: vi.fn(),
        isFile: vi.fn(),
        listDirectory: vi.fn(),
        readTextFile: vi.fn(),
      },
    };

    await (notifyFilesChanged as unknown as (...args: unknown[]) => Promise<unknown>)(
      new Map([[plugin.id, { plugin }]]),
      files,
      '/ws',
      context,
    );

    expect(onFilesChanged).toHaveBeenCalledWith(files, '/ws', context);
  });

  it('deduplicates additional file paths returned by matching plugins', async () => {
    const onFilesChanged = vi.fn().mockResolvedValue(['src/a.ts', 'src/a.ts', '', 42]);
    const plugin = makePlugin({ onFilesChanged });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await expect(
      notifyFilesChanged(new Map([[plugin.id, { plugin }]]), files, '/ws'),
    ).resolves.toEqual({
      additionalFilePaths: ['src/a.ts'],
      requiresFullRefresh: false,
    });
  });

  it('matches wildcard plugins and file extensions case-insensitively while skipping non-matching files', async () => {
    const wildcardPlugin = makePlugin({
      id: 'wildcard-plugin',
      supportedExtensions: ['*'],
      onFilesChanged: vi.fn().mockResolvedValue(undefined),
    });
    const caseInsensitivePlugin = makePlugin({
      id: 'case-plugin',
      supportedExtensions: ['.ts', '.tsx'],
      onFilesChanged: vi.fn().mockResolvedValue([]),
    });
    const ignoredPlugin = makePlugin({
      id: 'ignored-plugin',
      supportedExtensions: ['.py'],
      onFilesChanged: vi.fn().mockResolvedValue([]),
    });
    const files = [
      { absolutePath: '/ws/src/a.TS', relativePath: 'src/a.TS', content: '' },
      { absolutePath: '/ws/src/b.tsx', relativePath: 'src/b.tsx', content: '' },
    ];

    const result = await notifyFilesChanged(
      new Map([
        [wildcardPlugin.id, { plugin: wildcardPlugin }],
        [caseInsensitivePlugin.id, { plugin: caseInsensitivePlugin }],
        [ignoredPlugin.id, { plugin: ignoredPlugin }],
      ]),
      files,
      '/ws',
    );

    expect(result).toEqual({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    });
    expect(wildcardPlugin.onFilesChanged).toHaveBeenCalledWith(
      files,
      '/ws',
      expect.objectContaining({ mode: 'workspace' }),
    );
    expect(caseInsensitivePlugin.onFilesChanged).toHaveBeenCalledWith(
      files,
      '/ws',
      expect.objectContaining({ mode: 'workspace' }),
    );
    expect(ignoredPlugin.onFilesChanged).not.toHaveBeenCalled();
  });

  it('requests a full refresh when a matching plugin only exposes pre-analysis hooks', async () => {
    const plugin = makePlugin({ onPreAnalyze: vi.fn().mockResolvedValue(undefined) });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await expect(
      notifyFilesChanged(new Map([[plugin.id, { plugin }]]), files, '/ws'),
    ).resolves.toEqual({
      additionalFilePaths: [],
      requiresFullRefresh: true,
    });
  });

  it('does not request a refresh when a matching plugin has neither change nor pre-analysis hooks', async () => {
    const plugin = makePlugin({
      onFilesChanged: undefined,
      onPreAnalyze: undefined,
    });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await expect(
      notifyFilesChanged(new Map([[plugin.id, { plugin }]]), files, '/ws'),
    ).resolves.toEqual({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    });
  });

  it('continues after plugin change-hook failures and requests a full refresh', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const brokenPlugin = makePlugin({
      id: 'broken-plugin',
      onFilesChanged: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const healthyPlugin = makePlugin({
      id: 'healthy-plugin',
      onFilesChanged: vi.fn().mockResolvedValue(['src/extra.ts']),
    });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await expect(
      notifyFilesChanged(
        new Map([
          [brokenPlugin.id, { plugin: brokenPlugin }],
          [healthyPlugin.id, { plugin: healthyPlugin }],
        ]),
        files,
        '/ws',
      ),
    ).resolves.toEqual({
      additionalFilePaths: ['src/extra.ts'],
      requiresFullRefresh: true,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error in onFilesChanged for broken-plugin:',
      expect.any(Error),
    );
    expect(healthyPlugin.onFilesChanged).toHaveBeenCalledWith(
      files,
      '/ws',
      expect.objectContaining({ mode: 'workspace' }),
    );
  });
});
