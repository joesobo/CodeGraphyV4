import { describe, expect, it, vi } from 'vitest';
import { readCodeGraphyWorkspaceSettings } from '../../src';
import { createWorkspaceIndexRegistry } from '../../src/indexing/registry';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('createWorkspaceIndexRegistry', () => {
  it('unloads plugins registered before construction fails', async () => {
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
    const options = {
      workspaceRoot,
      plugins: [plugin, plugin],
      includeCorePlugins: false,
    };

    await expect(createWorkspaceIndexRegistry(
      options,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
    )).rejects.toThrow(`Plugin with ID '${plugin.id}' is already registered`);

    expect(onUnload).toHaveBeenCalledOnce();
  });
});
