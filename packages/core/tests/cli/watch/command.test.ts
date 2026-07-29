import { describe, expect, it, vi } from 'vitest';
import { runWatchCommand } from '../../../src/cli/watch/command';

describe('CLI watch command', () => {
  it('streams readiness, forwards file events, and shuts down cleanly', async () => {
    const lifecycle: string[] = [];
    const events: Array<Record<string, unknown>> = [];
    const notify = vi.fn();
    let forwardFileEvents: ((events: Array<{ path: string; type: 'update' }>) => void) | undefined;
    let emitUpdaterEvent: ((event: Record<string, unknown>) => void) | undefined;

    const result = await runWatchCommand('/workspace', {
      cwd: () => '/cwd',
      createUpdater(options) {
        emitUpdaterEvent = options.onEvent as typeof emitUpdaterEvent;
        return {
          async start() {
            forwardFileEvents?.([
              { path: '/workspace/.codegraphy/settings.json', type: 'update' },
              { path: '/workspace/src/app.ts', type: 'update' },
            ]);
            emitUpdaterEvent?.({
              type: 'ready',
              result: {
                workspaceRoot: '/workspace',
                graphCachePath: '/workspace/.codegraphy/graph.sqlite',
                files: [{}, {}],
                totalFound: 2,
                limitReached: false,
                indexing: {
                  mode: 'full',
                  analyzedFiles: 2,
                  deletedFiles: 0,
                  reusedFiles: 0,
                },
              },
            });
            lifecycle.push('started');
            return {} as never;
          },
          notify,
          async dispose() {
            lifecycle.push('updater-disposed');
          },
        };
      },
      async subscribe(options) {
        forwardFileEvents = options.onEvents as typeof forwardFileEvents;
        lifecycle.push('subscribed');
        return {
          async dispose() {
            lifecycle.push('subscription-disposed');
          },
        };
      },
      async waitForStop() {
        lifecycle.push('stop-listening');
      },
    }, {
      writeEvent: event => events.push(event),
    });

    expect(result).toEqual({ exitCode: 0, output: '' });
    expect(notify).toHaveBeenCalledWith([
      '/workspace/.codegraphy/settings.json',
      '/workspace/src/app.ts',
    ]);
    expect(events).toEqual([
      expect.objectContaining({ event: 'ready', indexedFiles: 2 }),
      expect.objectContaining({ event: 'stopped' }),
    ]);
    expect(lifecycle).toEqual([
      'stop-listening',
      'subscribed',
      'started',
      'subscription-disposed',
      'updater-disposed',
    ]);
  });

  it('captures shutdown and drains buffered changes during initial synchronization', async () => {
    const notify = vi.fn();
    let finishStart!: () => void;
    let stop!: () => void;
    let forwardFileEvents!: (events: Array<{ path: string; type: 'update' }>) => void;
    let markStartEntered!: () => void;
    let markSubscribed!: () => void;
    const startGate = new Promise<void>(resolve => { finishStart = resolve; });
    const stopGate = new Promise<void>(resolve => { stop = resolve; });
    const startEntered = new Promise<void>(resolve => { markStartEntered = resolve; });
    const subscribed = new Promise<void>(resolve => { markSubscribed = resolve; });

    const running = runWatchCommand('/workspace', {
      cwd: () => '/cwd',
      createUpdater() {
        return {
          async start() {
            markStartEntered();
            await startGate;
            return {} as never;
          },
          notify,
          async dispose() {},
        };
      },
      async subscribe(options) {
        forwardFileEvents = options.onEvents as typeof forwardFileEvents;
        markSubscribed();
        return { async dispose() {} };
      },
      waitForStop: () => stopGate,
    });
    await subscribed;
    await startEntered;

    forwardFileEvents([{
      path: '/workspace/.codegraphy/settings.json',
      type: 'update',
    }]);
    stop();
    finishStart();
    await running;

    expect(notify).toHaveBeenCalledWith(['/workspace/.codegraphy/settings.json']);
  });

  it('serializes bounded updater and subscription events', async () => {
    const events: Array<Record<string, unknown>> = [];
    const filePaths = Array.from({ length: 21 }, (_, index) => `/workspace/src/${index}.ts`);

    await runWatchCommand('/workspace', {
      cwd: () => '/cwd',
      createUpdater(options) {
        return {
          async start() {
            options.onEvent?.({ type: 'updating', filePaths });
            options.onEvent?.({
              type: 'updated',
              durationMs: 42,
              filePaths,
              result: {
                workspaceRoot: '/workspace',
                graphCachePath: '/workspace/.codegraphy/graph.sqlite',
                files: [],
                totalFound: 0,
                limitReached: false,
                indexing: {
                  mode: 'incremental',
                  analyzedFiles: 1,
                  deletedFiles: 0,
                  reusedFiles: 0,
                },
              } as never,
            });
            options.onEvent?.({ type: 'error', error: new Error('update failed'), filePaths });
            options.onEvent?.({ type: 'error', error: 'unknown failure', filePaths: [] });
            return {} as never;
          },
          notify() {},
          async dispose() {},
        };
      },
      async subscribe(options) {
        options.onError?.(new Error('subscription failed'));
        return { async dispose() {} };
      },
      async waitForStop() {},
    }, {
      writeEvent: event => events.push(event),
    });

    expect(events).toEqual([
      {
        event: 'error',
        code: 'watch_subscription_failed',
        message: 'subscription failed',
      },
      {
        event: 'updating',
        filePaths: filePaths.slice(0, 20),
        totalFiles: 21,
        complete: false,
      },
      expect.objectContaining({
        event: 'updated',
        durationMs: 42,
        totalFiles: 21,
        complete: false,
      }),
      expect.objectContaining({
        event: 'error',
        code: 'watch_update_failed',
        message: 'update failed',
        totalFiles: 21,
      }),
      expect.objectContaining({
        event: 'error',
        code: 'watch_update_failed',
        message: 'unknown failure',
        totalFiles: 0,
        complete: true,
      }),
      { event: 'stopped', workspaceRoot: '/workspace' },
    ]);
  });

  it('does not install process handlers when updater creation fails', async () => {
    const waitForStop = vi.fn(async () => undefined);

    await expect(runWatchCommand('/workspace', {
      cwd: () => '/cwd',
      createUpdater() {
        throw new Error('updater failed');
      },
      async subscribe() {
        return { async dispose() {} };
      },
      waitForStop,
    })).rejects.toThrow('updater failed');

    expect(waitForStop).not.toHaveBeenCalled();
  });

  it('disposes startup resources when workspace subscription fails', async () => {
    const dispose = vi.fn();
    let stopSignal: AbortSignal | undefined;

    await expect(runWatchCommand('/workspace', {
      cwd: () => '/cwd',
      createUpdater() {
        return {
          async start() {
            return {} as never;
          },
          notify() {},
          dispose,
        };
      },
      async subscribe() {
        throw new Error('subscription failed');
      },
      async waitForStop(signal) {
        stopSignal = signal;
      },
    })).rejects.toThrow('subscription failed');

    expect(dispose).toHaveBeenCalledOnce();
    expect(stopSignal?.aborted).toBe(true);
  });
});
