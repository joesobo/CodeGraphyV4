import { describe, expect, it, vi } from 'vitest';
import {
  notifyGraphRebuild,
  notifyPostAnalyze,
  notifyPreAnalyze,
} from '../../../../../src/core/plugins/lifecycle/notify/analysis';
import type { IPlugin } from '../../../../../src/core/plugins/types/contracts';

const emptyGraph = { nodes: [], edges: [] };

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

describe('plugin lifecycle notify/analysis', () => {
  it('passes the analysis context to pre-analysis hooks', async () => {
    const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
    const plugin = makePlugin({ onPreAnalyze });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];
    const context = {
      mode: 'timeline',
      commitSha: 'abc123',
      fileSystem: {
        exists: vi.fn(),
        isDirectory: vi.fn(),
        isFile: vi.fn(),
        listDirectory: vi.fn(),
        readTextFile: vi.fn(),
      },
    };

    await (notifyPreAnalyze as unknown as (...args: unknown[]) => Promise<void>)(
      new Map([[plugin.id, { plugin }]]),
      files,
      '/ws',
      context,
    );

    expect(onPreAnalyze).toHaveBeenCalledWith(files, '/ws', context);
  });

  it('calls onPreAnalyze with the shared files payload', async () => {
    const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
    const plugin = makePlugin({ onPreAnalyze });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await notifyPreAnalyze(new Map([[plugin.id, { plugin }]]), files, '/ws');

    expect(onPreAnalyze).toHaveBeenCalledWith(
      files,
      '/ws',
      expect.objectContaining({ mode: 'workspace' }),
    );
  });

  it('calls post-analysis hooks when they are present', () => {
    const onPostAnalyze = vi.fn();
    const onGraphRebuild = vi.fn();
    const plugin = makePlugin({ onPostAnalyze, onGraphRebuild });
    const plugins = new Map([[plugin.id, { plugin }]]);

    notifyPostAnalyze(plugins, emptyGraph);
    notifyGraphRebuild(plugins, emptyGraph);

    expect(onPostAnalyze).toHaveBeenCalledWith(emptyGraph);
    expect(onGraphRebuild).toHaveBeenCalledWith(emptyGraph);
  });
});
