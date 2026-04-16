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
  it('calls onPreAnalyze with the shared files payload', async () => {
    const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
    const plugin = makePlugin({ onPreAnalyze });
    const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

    await notifyPreAnalyze(new Map([[plugin.id, { plugin }]]), files, '/ws');

    expect(onPreAnalyze).toHaveBeenCalledWith(files, '/ws');
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
