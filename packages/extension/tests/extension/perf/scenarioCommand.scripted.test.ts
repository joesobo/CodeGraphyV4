import { describe, expect, it, vi } from 'vitest';

import {
  runPerfScenario,
  type PerfScenarioRuntime,
} from '../../../src/extension/perf/scenarioCommand';

function createScriptedRuntime(): PerfScenarioRuntime {
  const extensionHandlers = new Set<(message: unknown) => void>();
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
      handler({ type: 'PHYSICS_STABILIZED' });
      return { dispose: vi.fn() };
    }),
    openGraph: vi.fn(async () => {
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
    }),
    startMetricSession: vi.fn(() => ({ dispose: vi.fn() })),
  } satisfies PerfScenarioRuntime;

  return runtime;
}

describe('performance scripted scenarios', () => {
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

  it('signals process sampling after bootstrap and before idle work starts', async () => {
    const runtime = createScriptedRuntime();
    runtime.notifyScenarioReady = vi.fn(async () => {});

    await runPerfScenario({
      runId: 'run-idle',
      scenario: 'idle-watch',
      dimension: 'small',
      startedAt: 5,
      idleCpuReadyPath: '/tmp/run-idle.ready',
    }, runtime);

    expect(runtime.notifyScenarioReady).toHaveBeenCalledWith({
      runId: 'run-idle',
      scenario: 'idle-watch',
      dimension: 'small',
      startedAt: 5,
      idleCpuReadyPath: '/tmp/run-idle.ready',
    });
    expect(vi.mocked(runtime.notifyScenarioReady).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(runtime.runScriptedScenario!).mock.invocationCallOrder[0]);
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
});
