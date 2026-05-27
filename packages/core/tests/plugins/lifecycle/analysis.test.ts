import type { IGraphData } from '../../../src/graph/contracts';
import type { ILifecyclePluginInfo } from '../../../src/plugins/lifecycle/contracts';
import {
  notifyGraphRebuild,
  notifyPostAnalyze,
  notifyPreAnalyze,
} from '../../../src/plugins/lifecycle/notify/analysis';
import { describe, expect, it, vi } from 'vitest';

const emptyGraph: IGraphData = { nodes: [], edges: [] };

function pluginInfo(plugin: ILifecyclePluginInfo['plugin']): ILifecyclePluginInfo {
  return { plugin };
}

describe('plugins/lifecycle analysis notifications', () => {
  it('notifies matching lifecycle hooks and skips plugins without hooks', async () => {
    const onPreAnalyze = vi.fn();
    const onPostAnalyze = vi.fn();
    const onGraphRebuild = vi.fn();
    const plugins = new Map<string, ILifecyclePluginInfo>([
      ['full', pluginInfo({
        id: 'full',
        name: 'Full',
        version: '1.0.0',
        apiVersion: '2',
        supportedExtensions: ['.ts'],
        onPreAnalyze,
        onPostAnalyze,
        onGraphRebuild,
      })],
      ['empty', pluginInfo({
        id: 'empty',
        name: 'Empty',
        version: '1.0.0',
        apiVersion: '2',
        supportedExtensions: ['.ts'],
      })],
    ]);
    const files = [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts', content: 'content' }];

    await notifyPreAnalyze(plugins, files, '/workspace');
    notifyPostAnalyze(plugins, emptyGraph);
    notifyGraphRebuild(plugins, emptyGraph);

    expect(onPreAnalyze).toHaveBeenCalledWith(files, '/workspace', expect.any(Object));
    expect(onPostAnalyze).toHaveBeenCalledWith(emptyGraph);
    expect(onGraphRebuild).toHaveBeenCalledWith(emptyGraph);
  });

  it('logs lifecycle hook errors without stopping later plugins', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const afterRebuild = vi.fn();
    const plugins = new Map<string, ILifecyclePluginInfo>([
      ['failing', pluginInfo({
        id: 'failing',
        name: 'Failing',
        version: '1.0.0',
        apiVersion: '2',
        supportedExtensions: ['.ts'],
        onGraphRebuild: () => {
          throw new Error('boom');
        },
      })],
      ['after', pluginInfo({
        id: 'after',
        name: 'After',
        version: '1.0.0',
        apiVersion: '2',
        supportedExtensions: ['.ts'],
        onGraphRebuild: afterRebuild,
      })],
    ]);

    notifyGraphRebuild(plugins, emptyGraph);

    expect(afterRebuild).toHaveBeenCalledWith(emptyGraph);
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Error in onGraphRebuild for failing:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
