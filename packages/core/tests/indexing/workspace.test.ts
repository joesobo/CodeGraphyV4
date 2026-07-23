import { describe, expect, it, vi } from 'vitest';
import { indexCodeGraphyWorkspace } from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('indexCodeGraphyWorkspace disposal', () => {
  it('unloads plugins when load-phase diagnostics fail', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      onUnload,
    };

    await expect(indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
      diagnostics: {
        emit(event) {
          if (event.context?.phase === 'load-plugins') {
            throw new Error('diagnostics failed');
          }
        },
      },
    })).rejects.toThrow('diagnostics failed');

    expect(onUnload).toHaveBeenCalledOnce();
  });
});
