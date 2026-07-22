import { describe, expect, it, vi } from 'vitest';
import { createCodeGraphyWorkspaceEngine } from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('createCodeGraphyWorkspaceEngine', () => {
  it('keeps plugins loaded until disposal and disposes once', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        onUnload,
      }],
      includeCorePlugins: false,
    });

    await engine.index();
    expect(onUnload).not.toHaveBeenCalled();

    engine.dispose();
    engine.dispose();

    expect(onUnload).toHaveBeenCalledOnce();
  });
});
