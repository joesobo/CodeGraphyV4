import { describe, expect, it, vi } from 'vitest';

import {
  runPerfScenario,
  type PerfScenarioRuntime,
} from '../../../src/extension/perf/scenarioCommand';

function createScriptedRuntime(
  options: { webviewAvailableOnlyAfterOpen?: boolean } = {},
): PerfScenarioRuntime {
  const extensionHandlers = new Set<(message: unknown) => void>();
  const webviewHandlers = new Set<(message: unknown) => void>();
  let graphOpen = false;
  let metricListener: ((event: never) => void) | undefined;
  const runtime = {
    emitMetric: vi.fn((context) => {
      metricListener?.({
        area: 'performance',
        event: 'metric',
        context,
      } as never);
    }),
    indexGraph: vi.fn(async () => {}),
    now: vi.fn(() => 25),
    onExtensionMessage: vi.fn((handler) => {
      extensionHandlers.add(handler);
      return { dispose: () => { extensionHandlers.delete(handler); } };
    }),
    onMetric: vi.fn((listener) => {
      metricListener = listener as (event: never) => void;
      return { dispose: vi.fn() };
    }),
    onWebviewMessage: vi.fn((handler) => {
      if (options.webviewAvailableOnlyAfterOpen && !graphOpen) {
        return { dispose: vi.fn() };
      }
      handler({ type: 'PHYSICS_STABILIZED' });
      return { dispose: () => { webviewHandlers.delete(handler); } };
    }),
    openGraph: vi.fn(async () => {
      graphOpen = true;
      for (const handler of extensionHandlers) {
        handler({ type: 'APP_BOOTSTRAP_COMPLETE' });
        handler({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
        handler({
          type: 'GRAPH_INDEX_STATUS_UPDATED',
          payload: { hasIndex: true },
        });
      }
    }),
    runScriptedScenario: vi.fn(async (request) => {
      runtime.emitMetric({
        runId: request.runId,
        scenario: request.scenario,
        operationId: `${request.runId}:${request.scenario}:${request.dimension}:0`,
        dimension: request.dimension,
        metric: 'fileOpRoundtripMs',
        unit: 'ms',
        value: 12,
      });
      return request.scenario === 'rename'
        ? {
            codeGraphyRevealMs: 7,
            explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
          }
        : undefined;
    }),
    startMetricSession: vi.fn(() => ({ dispose: vi.fn() })),
  } satisfies PerfScenarioRuntime;

  return runtime;
}

describe('performance scripted scenarios', () => {
  it('subscribes to physics after the graph webview becomes available', async () => {
    vi.useFakeTimers();
    const runtime = createScriptedRuntime({ webviewAvailableOnlyAfterOpen: true });

    const pending = runPerfScenario({
      runId: 'run-initial-physics',
      scenario: 'warm-open',
      dimension: 'small',
      startedAt: 5,
    }, runtime);
    const assertion = expect(pending).resolves.toMatchObject({
      runId: 'run-initial-physics',
      scenario: 'warm-open',
    });

    await vi.advanceTimersByTimeAsync(180_000);
    await assertion;
    expect(runtime.onWebviewMessage).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('runs a file scenario after the cached graph is ready', async () => {
    const runtime = createScriptedRuntime();

    await expect(runPerfScenario({
      runId: 'run-rename',
      scenario: 'rename',
      dimension: 'small',
      startedAt: 5,
    }, runtime)).resolves.toEqual({
      runId: 'run-rename',
      scenario: 'rename',
      comparison: {
        codeGraphyRevealMs: 7,
        explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
      },
      metrics: [{
        operationId: 'run-rename:rename:small:0',
        dimension: 'small',
        metric: 'fileOpRoundtripMs',
        unit: 'ms',
        value: 12,
      }],
    });
    expect(runtime.runScriptedScenario).toHaveBeenCalledWith({
      runId: 'run-rename',
      scenario: 'rename',
      dimension: 'small',
      startedAt: 5,
    });
  });

  it('does not signal process sampling before correlated idle work starts', async () => {
    const runtime = createScriptedRuntime();
    const notifyScenarioReady = vi.fn(async () => {});
    const runtimeWithLegacySignal = { ...runtime, notifyScenarioReady };

    await runPerfScenario({
      runId: 'run-idle',
      scenario: 'idle-watch',
      dimension: 'small',
      startedAt: 5,
      idleCpuReadyPath: '/tmp/run-idle.ready',
    }, runtimeWithLegacySignal);

    expect(notifyScenarioReady).not.toHaveBeenCalled();
  });

  it('rejects a scripted request without a fixture dimension', async () => {
    const runtime = createScriptedRuntime();

    await expect(runPerfScenario({
      runId: 'run-rename',
      scenario: 'rename',
      startedAt: 5,
    }, runtime)).rejects.toThrow();

    expect(runtime.openGraph).not.toHaveBeenCalled();
  });

  it('rejects a comparison payload that does not match the scenario', async () => {
    const runtime = createScriptedRuntime();
    runtime.runScriptedScenario = vi.fn(async () => ({
      explorer: { explorerDeleteMs: 9 },
    }));

    await expect(runPerfScenario({
      runId: 'run-create',
      scenario: 'create',
      dimension: 'small',
      startedAt: 5,
    }, runtime)).rejects.toThrow();
  });
});
