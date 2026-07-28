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
      async waitForStop() {},
    }, {
      writeEvent: event => events.push(event),
    });

    expect(result).toEqual({ exitCode: 0, output: '' });
    expect(notify).toHaveBeenCalledWith(['/workspace/src/app.ts']);
    expect(events).toEqual([
      expect.objectContaining({ event: 'ready', indexedFiles: 2 }),
      expect.objectContaining({ event: 'stopped' }),
    ]);
    expect(lifecycle).toEqual([
      'subscribed',
      'started',
      'subscription-disposed',
      'updater-disposed',
    ]);
  });
});
