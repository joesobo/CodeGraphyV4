import { describe, expect, it, vi } from 'vitest';
import {
  notifyWebviewReady,
  notifyWebviewReadyForPlugin,
  notifyWorkspaceReady,
  notifyWorkspaceReadyForPlugin,
} from '../../../../../src/core/plugins/lifecycle/notify/readiness';
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

describe('plugin lifecycle notify/readiness', () => {
  it('notifies every plugin map entry when readiness events are broadcast', () => {
    const onWorkspaceReady = vi.fn();
    const onWebviewReady = vi.fn();
    const plugin = makePlugin({ onWorkspaceReady, onWebviewReady });
    const plugins = new Map([[plugin.id, { plugin }]]);

    notifyWorkspaceReady(plugins, emptyGraph);
    notifyWebviewReady(plugins);

    expect(onWorkspaceReady).toHaveBeenCalledWith(emptyGraph);
    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('swallows readiness hook failures for individual plugins', () => {
    const plugin = makePlugin({
      onWorkspaceReady: vi.fn(() => {
        throw new Error('workspace crash');
      }),
      onWebviewReady: vi.fn(() => {
        throw new Error('webview crash');
      }),
    });

    expect(() => notifyWorkspaceReadyForPlugin({ plugin }, emptyGraph)).not.toThrow();
    expect(() => notifyWebviewReadyForPlugin({ plugin })).not.toThrow();
  });
});
