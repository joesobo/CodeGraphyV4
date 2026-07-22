import { describe, expect, it, vi } from 'vitest';
import { createCodeGraphyWorkspaceEngine } from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('workspace engine setup', () => {
  it('disposes the previous registry after replacement', async () => {
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
    await engine.index();

    expect(onUnload).toHaveBeenCalledOnce();

    engine.dispose();
    expect(onUnload).toHaveBeenCalledTimes(2);
  });
});
