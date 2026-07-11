import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceCachePersistenceScheduler } from '../../../../../src/extension/pipeline/database/cache/scheduler';

function createHarness() {
  const idleCallbacks: Array<() => void> = [];
  const saveFull = vi.fn(async (): Promise<void> => undefined);
  const savePatch = vi.fn(async (): Promise<void> => undefined);
  const warn = vi.fn();
  const scheduler = createWorkspaceCachePersistenceScheduler({
    saveFull,
    savePatch,
    scheduleIdle: callback => {
      idleCallbacks.push(callback);
    },
    warn,
  });
  return { idleCallbacks, saveFull, savePatch, scheduler, warn };
}

async function runNextIdle(idleCallbacks: Array<() => void>): Promise<void> {
  idleCallbacks.shift()?.();
  await vi.waitFor(() => expect(idleCallbacks.length).toBeGreaterThanOrEqual(0));
  await new Promise(resolve => setImmediate(resolve));
}

describe('extension/pipeline/database/cache/scheduler', () => {
  it('does not start a patch until the caller has yielded to idle', async () => {
    const { idleCallbacks, savePatch, scheduler } = createHarness();

    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: [],
      upsertFiles: { 'src/app.ts': { mtime: 1, analysis: {} } as never },
    });

    expect(savePatch).not.toHaveBeenCalled();
    expect(idleCallbacks).toHaveLength(1);
    await runNextIdle(idleCallbacks);
    expect(savePatch).toHaveBeenCalledOnce();
  });

  it('coalesces a patch burst into one latest-state transaction', async () => {
    const { idleCallbacks, savePatch, scheduler } = createHarness();

    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFiles: {},
    });
    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: [],
      upsertFiles: { 'src/app.ts': { mtime: 1, analysis: {} } as never },
    });
    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: ['src/app.ts'],
      upsertFiles: {},
    });

    expect(idleCallbacks).toHaveLength(1);
    await runNextIdle(idleCallbacks);

    expect(savePatch).toHaveBeenCalledWith('/workspace', {
      deleteFilePaths: ['src/app.ts', 'src/deleted.ts'],
      upsertFiles: {},
    });
  });

  it('lets a full snapshot supersede older patches and applies newer patches afterward', async () => {
    const { idleCallbacks, saveFull, savePatch, scheduler } = createHarness();
    const cache = { version: '1', files: { 'src/app.ts': { mtime: 1, analysis: {} } } } as never;

    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: ['src/old.ts'],
      upsertFiles: {},
    });
    scheduler.scheduleFull('/workspace', cache);
    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: [],
      upsertFiles: { 'src/new.ts': { mtime: 2, analysis: {} } as never },
    });
    await runNextIdle(idleCallbacks);

    expect(saveFull).toHaveBeenCalledOnce();
    expect(savePatch).toHaveBeenCalledWith('/workspace', {
      deleteFilePaths: [],
      upsertFiles: { 'src/new.ts': { mtime: 2, analysis: {} } },
    });
    expect(saveFull.mock.invocationCallOrder[0]).toBeLessThan(savePatch.mock.invocationCallOrder[0]);
  });

  it('schedules one follow-up flush for state requested during an active save', async () => {
    const { idleCallbacks, savePatch, scheduler } = createHarness();
    let finishFirstSave: (() => void) | undefined;
    savePatch.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    }));

    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: ['src/first.ts'],
      upsertFiles: {},
    });
    idleCallbacks.shift()?.();
    await vi.waitFor(() => expect(savePatch).toHaveBeenCalledOnce());
    scheduler.schedulePatch('/workspace', {
      deleteFilePaths: ['src/second.ts'],
      upsertFiles: {},
    });
    finishFirstSave?.();
    await vi.waitFor(() => expect(idleCallbacks).toHaveLength(1));
    await runNextIdle(idleCallbacks);

    expect(savePatch).toHaveBeenCalledTimes(2);
    expect(savePatch).toHaveBeenLastCalledWith('/workspace', {
      deleteFilePaths: ['src/second.ts'],
      upsertFiles: {},
    });
  });
});
