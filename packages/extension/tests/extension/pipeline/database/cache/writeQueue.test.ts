import { describe, expect, it, vi } from 'vitest';
import { enqueueWorkspaceCacheWrite } from '../../../../../src/extension/pipeline/database/cache/writeQueue';

function deferred(): { promise: Promise<void>; resolve(): void } {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('pipeline/database/cache write queue', () => {
  it('serializes writes for one workspace while allowing another workspace to proceed', async () => {
    const first = deferred();
    const operations: string[] = [];
    const firstWrite = enqueueWorkspaceCacheWrite('/a', 'full', async () => {
      operations.push('a:first');
      await first.promise;
    });
    const patch = enqueueWorkspaceCacheWrite('/a', 'patch', async () => {
      operations.push('a:patch');
    });
    const otherWorkspace = enqueueWorkspaceCacheWrite('/b', 'full', async () => {
      operations.push('b:first');
    });

    await otherWorkspace;
    expect(operations).toEqual(['a:first', 'b:first']);
    first.resolve();
    await Promise.all([firstWrite, patch]);
    expect(operations).toEqual(['a:first', 'b:first', 'a:patch']);
  });

  it('coalesces consecutive queued full saves to the latest cache snapshot', async () => {
    const first = deferred();
    const second = vi.fn(async () => undefined);
    const latest = vi.fn(async () => undefined);
    const running = enqueueWorkspaceCacheWrite('/workspace', 'patch', async () => first.promise);
    const superseded = enqueueWorkspaceCacheWrite('/workspace', 'full', second);
    const retained = enqueueWorkspaceCacheWrite('/workspace', 'full', latest);

    first.resolve();
    await Promise.all([running, superseded, retained]);

    expect(second).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });

  it('continues with the next write after a failure', async () => {
    const next = vi.fn(async () => undefined);
    const failed = enqueueWorkspaceCacheWrite('/workspace-failure', 'clear', async () => {
      throw new Error('failed');
    });
    const continued = enqueueWorkspaceCacheWrite('/workspace-failure', 'patch', next);

    await expect(failed).rejects.toThrow('failed');
    await continued;
    expect(next).toHaveBeenCalledOnce();
  });
});
