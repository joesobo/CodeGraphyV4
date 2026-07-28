import { describe, expect, it, vi } from 'vitest';
import { createExtensionWorkspaceCacheUpdater } from '../../../../src/extension/workspaceFiles/cache/model';

describe('Extension workspace cache updater', () => {
  it('does not update a Graph Cache before the workspace has been indexed', async () => {
    const updateWorkspaceCache = vi.fn();
    const updater = createExtensionWorkspaceCacheUpdater({
      hasGraphCache: () => false,
      updateWorkspaceCache,
    });

    await updater.update('/workspace', ['/workspace/src/a.ts']);

    expect(updateWorkspaceCache).not.toHaveBeenCalled();
  });

  it('serializes closed-view cache updates', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const updateWorkspaceCache = vi.fn()
      .mockImplementationOnce(() => firstGate)
      .mockResolvedValueOnce(undefined);
    const updater = createExtensionWorkspaceCacheUpdater({
      hasGraphCache: () => true,
      updateWorkspaceCache,
    });

    const first = updater.update('/workspace', ['/workspace/src/a.ts']);
    const second = updater.update('/workspace', ['/workspace/src/b.ts']);
    await Promise.resolve();

    expect(updateWorkspaceCache).toHaveBeenCalledOnce();

    releaseFirst();
    await Promise.all([first, second]);

    expect(updateWorkspaceCache).toHaveBeenNthCalledWith(
      1,
      '/workspace',
      ['/workspace/src/a.ts'],
    );
    expect(updateWorkspaceCache).toHaveBeenNthCalledWith(
      2,
      '/workspace',
      ['/workspace/src/b.ts'],
    );
  });

  it('continues after a failed cache update', async () => {
    const updateWorkspaceCache = vi.fn()
      .mockRejectedValueOnce(new Error('update failed'))
      .mockResolvedValueOnce(undefined);
    const updater = createExtensionWorkspaceCacheUpdater({
      hasGraphCache: () => true,
      updateWorkspaceCache,
    });

    await expect(updater.update('/workspace', ['/workspace/src/a.ts']))
      .rejects.toThrow('update failed');
    await expect(updater.update('/workspace', ['/workspace/src/b.ts']))
      .resolves.toBeUndefined();

    expect(updateWorkspaceCache).toHaveBeenCalledTimes(2);
    await updater.dispose();
  });
});
