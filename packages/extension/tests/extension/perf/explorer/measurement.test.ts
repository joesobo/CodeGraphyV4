import { describe, expect, it, vi } from 'vitest';
import { measureExplorerWorkspaceEventLatency } from '../../../../src/extension/perf/explorer/measurement';

interface TestEvent {
  path: string;
}

describe('extension/perf/explorer/measurement', () => {
  it('subscribes before starting the workspace edit', async () => {
    const order: string[] = [];
    let listener: ((event: TestEvent) => void) | undefined;

    await measureExplorerWorkspaceEventLatency<TestEvent>({
      label: 'rename',
      subscribe(nextListener) {
        order.push('subscribe');
        listener = nextListener;
        return { dispose: vi.fn() };
      },
      matches: event => event.path === '/target',
      apply: async () => {
        order.push('apply');
        listener?.({ path: '/target' });
        return true;
      },
      completeVisibility: async () => { order.push('reveal'); },
    }, {
      now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(25),
      waitForWorkbenchDispatchTurn: async () => { order.push('dispatch'); },
    });

    expect(order).toEqual(['subscribe', 'apply', 'reveal', 'dispatch']);
  });

  it('stops after revealing the affected row and a dispatch turn', async () => {
    const order: string[] = [];
    let listener: ((event: TestEvent) => void) | undefined;
    const dispose = vi.fn();
    const now = vi.fn(() => {
      order.push(order.includes('start') ? 'stop' : 'start');
      return order.includes('stop') ? 31 : 10;
    });
    const waitForWorkbenchDispatchTurn = vi.fn(async () => {
      order.push('dispatch');
    });

    const elapsedMs = await measureExplorerWorkspaceEventLatency<TestEvent>({
      label: 'create',
      subscribe(nextListener) {
        listener = nextListener;
        return { dispose };
      },
      matches: event => event.path === '/target',
      apply: async () => {
        order.push('apply');
        listener?.({ path: '/unrelated' });
        order.push('matching-event');
        listener?.({ path: '/target' });
        return true;
      },
      completeVisibility: async () => { order.push('reveal-affected-row'); },
    }, { now, waitForWorkbenchDispatchTurn });

    expect(elapsedMs).toBe(21);
    expect(order).toEqual([
      'start',
      'apply',
      'matching-event',
      'reveal-affected-row',
      'dispatch',
      'stop',
    ]);
    expect(waitForWorkbenchDispatchTurn).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('rejects a workspace edit that VS Code did not apply', async () => {
    const dispose = vi.fn();

    await expect(measureExplorerWorkspaceEventLatency<TestEvent>({
      label: 'delete',
      subscribe: () => ({ dispose }),
      matches: () => true,
      apply: async () => false,
      completeVisibility: async () => undefined,
    }, {
      now: () => 10,
      waitForWorkbenchDispatchTurn: async () => undefined,
    })).rejects.toThrow('VS Code did not apply Explorer delete workspace edit');

    expect(dispose).toHaveBeenCalledOnce();
  });

  it('keeps waiting after an unrelated workspace event', async () => {
    let listener: ((event: TestEvent) => void) | undefined;
    let completed = false;
    const pending = measureExplorerWorkspaceEventLatency<TestEvent>({
      label: 'rename',
      subscribe(nextListener) {
        listener = nextListener;
        return { dispose: vi.fn() };
      },
      matches: event => event.path === '/target',
      apply: async () => {
        listener?.({ path: '/unrelated' });
        return true;
      },
      completeVisibility: async () => undefined,
    }, {
      now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(20),
      waitForWorkbenchDispatchTurn: async () => undefined,
    }).then(() => { completed = true; });

    await new Promise<void>(resolve => setImmediate(resolve));
    expect(completed).toBe(false);
    listener?.({ path: '/target' });
    await pending;
  });

  it('times out at the configured workspace-event deadline', async () => {
    vi.useFakeTimers();
    const pending = measureExplorerWorkspaceEventLatency<TestEvent>({
      label: 'create',
      subscribe: () => ({ dispose: vi.fn() }),
      matches: () => true,
      apply: async () => true,
      completeVisibility: async () => undefined,
      timeoutMs: 25,
    }, {
      now: () => 10,
      waitForWorkbenchDispatchTurn: async () => undefined,
    });
    const assertion = expect(pending).rejects.toThrow(
      'Timed out waiting for Explorer create workspace event',
    );

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
    vi.useRealTimers();
  });
});
