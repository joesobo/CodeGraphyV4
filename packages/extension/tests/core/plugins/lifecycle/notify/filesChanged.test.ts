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
});
