import { describe, expect, it, vi } from 'vitest';
import { createExtensionWorkspaceCacheUpdater } from '../../../../src/extension/workspaceFiles/cache/model';

describe('Extension workspace cache updater', () => {
  it('reuses one Core updater while the Graph View remains closed', async () => {
    const start = vi.fn().mockResolvedValue({});
    const notify = vi.fn();
    const dispose = vi.fn().mockResolvedValue(undefined);
    const createUpdater = vi.fn(() => ({ start, notify, dispose }));
    const updater = createExtensionWorkspaceCacheUpdater({ createUpdater });

    await updater.update('/workspace', ['/workspace/src/a.ts']);
    await updater.update('/workspace', ['/workspace/src/b.ts']);

    expect(createUpdater).toHaveBeenCalledOnce();
    expect(createUpdater).toHaveBeenCalledWith({ workspaceRoot: '/workspace' });
    expect(start).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenNthCalledWith(1, ['/workspace/src/a.ts']);
    expect(notify).toHaveBeenNthCalledWith(2, ['/workspace/src/b.ts']);

    await updater.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('creates a fresh Core updater after startup fails', async () => {
    const failedDispose = vi.fn().mockResolvedValue(undefined);
    const recoveredNotify = vi.fn();
    const createUpdater = vi.fn()
      .mockReturnValueOnce({
        start: vi.fn().mockRejectedValue(new Error('startup failed')),
        notify: vi.fn(),
        dispose: failedDispose,
      })
      .mockReturnValueOnce({
        start: vi.fn().mockResolvedValue({}),
        notify: recoveredNotify,
        dispose: vi.fn().mockResolvedValue(undefined),
      });
    const updater = createExtensionWorkspaceCacheUpdater({ createUpdater });

    await expect(updater.update('/workspace', ['/workspace/src/a.ts']))
      .rejects.toThrow('startup failed');
    await expect(updater.update('/workspace', ['/workspace/src/b.ts']))
      .resolves.toBeUndefined();

    expect(createUpdater).toHaveBeenCalledTimes(2);
    expect(failedDispose).toHaveBeenCalledOnce();
    expect(recoveredNotify).toHaveBeenCalledWith(['/workspace/src/b.ts']);
    await updater.dispose();
  });
});
