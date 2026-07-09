import { describe, expect, it, vi } from 'vitest';

import {
  runIdleWatchScenario,
  runInteractionBurstScenario,
} from '../../../../src/extension/perf/scenarios/webviewControl';
import type { CorrelatedControlOperationRuntime } from '../../../../src/extension/perf/controlOperation';

const runtime = {} as CorrelatedControlOperationRuntime;

describe('extension/perf/scenarios/webviewControl', () => {
  it('runs a correlated interaction burst', async () => {
    const runInteractionBurst = vi.fn(() => true);
    const runControlOperation = vi.fn(async (operation, completion, start) => {
      expect(completion).toBe('interaction-complete');
      expect(start({ runInteractionBurst } as never)).toBe(true);
      return {
        elapsedMs: 21,
        event: {
          ...operation,
          kind: 'interaction-complete' as const,
          interaction: 'burst' as const,
          durationMs: 20,
        },
      };
    });

    await expect(runInteractionBurstScenario({
      dimension: 'small',
      ordinal: 0,
      runId: 'run-1',
    }, runtime, { runControlOperation })).resolves.toEqual({
      dimension: 'small',
      durationMs: 20,
      operationId: 'run-1:interaction-burst:small:0',
      scenario: 'interaction-burst',
    });
    expect(runInteractionBurst).toHaveBeenCalledOnce();
  });

  it('runs a sixty-second correlated idle watch by default', async () => {
    const runIdleWatch = vi.fn(() => true);
    const runControlOperation = vi.fn(async (operation, completion, start) => {
      expect(completion).toBe('idle-complete');
      expect(start({ runIdleWatch } as never)).toBe(true);
      return {
        elapsedMs: 60_001,
        event: {
          ...operation,
          kind: 'idle-complete' as const,
          durationMs: 60_000,
        },
      };
    });

    await expect(runIdleWatchScenario({
      dimension: 'small',
      ordinal: 0,
      runId: 'run-2',
    }, runtime, { runControlOperation })).resolves.toMatchObject({
      durationMs: 60_000,
      operationId: 'run-2:idle-watch:small:0',
      scenario: 'idle-watch',
    });
    expect(runIdleWatch).toHaveBeenCalledWith(60_000);
  });

  it('signals process sampling from the correlated idle-started event', async () => {
    const onIdleStarted = vi.fn();
    const runControlOperation = vi.fn(async (operation, _completion, _start, _runtime, options) => {
      options?.onEvent?.({
        ...operation,
        kind: 'idle-started' as const,
        durationMs: 60_000,
      });
      return {
        elapsedMs: 60_001,
        event: {
          ...operation,
          kind: 'idle-complete' as const,
          durationMs: 60_000,
        },
      };
    });

    await runIdleWatchScenario({
      dimension: 'small',
      ordinal: 0,
      runId: 'run-idle-started',
      onIdleStarted,
    }, runtime, { runControlOperation });

    expect(onIdleStarted).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'idle-started',
      durationMs: 60_000,
      operationId: 'run-idle-started:idle-watch:small:0',
    }));
  });
});
