import { describe, expect, it, vi } from 'vitest';
import {
  runPerfScenario,
  type PerfScenarioRuntime,
} from '../../../src/extension/perf/scenarioCommand';

function createRuntime(): PerfScenarioRuntime {
  const extensionMessageHandlers = new Set<(message: unknown) => void>();
  let metricListener: ((event: {
    area: 'performance';
    event: 'metric';
    context: {
      runId: string;
      scenario: 'cold-open' | 'warm-open';
      metric: 'coldOpenMs' | 'warmOpenMs';
      unit: 'ms';
      value: number;
    };
  }) => void) | undefined;
  const emitMetric = vi.fn((context: {
    runId: string;
    scenario: 'cold-open' | 'warm-open';
    metric: 'coldOpenMs' | 'warmOpenMs';
    unit: 'ms';
    value: number;
  }) => {
    metricListener?.({ area: 'performance', event: 'metric', context });
  });
  return {
    emitMetric,
    now: vi.fn(() => 25),
    onMetric: vi.fn((listener) => {
      metricListener = listener;
      return { dispose: vi.fn() };
    }),
    onExtensionMessage: vi.fn((handler: (message: unknown) => void) => {
      extensionMessageHandlers.add(handler);
      return { dispose: () => { extensionMessageHandlers.delete(handler); } };
    }),
    onWebviewMessage: vi.fn((handler: (message: unknown) => void) => {
      handler({ type: 'PHYSICS_STABILIZED' });
      return { dispose: vi.fn() };
    }),
    openGraph: vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'src/index.ts' }],
            edges: [{ source: 'src/index.ts', target: 'src/lib.ts' }],
          },
        });
        handler({
          type: 'GRAPH_INDEX_STATUS_UPDATED',
          payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
        });
        handler({ type: 'APP_BOOTSTRAP_COMPLETE' });
      }
    }),
    indexGraph: vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'src/index.ts' }],
            edges: [{ source: 'src/index.ts', target: 'src/lib.ts' }],
          },
        });
        handler({
          type: 'GRAPH_INDEX_STATUS_UPDATED',
          payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
        });
      }
    }),
    startMetricSession: vi.fn(() => ({ dispose: vi.fn() })),
  } as PerfScenarioRuntime;
}

describe('performance open scenarios', () => {
  it('measures cold open through production indexing and the final graph settle', async () => {
    const runtime = createRuntime();

    await expect(runPerfScenario({
      runId: 'run-1',
      scenario: 'cold-open',
      startedAt: 5,
    }, runtime)).resolves.toEqual({
      runId: 'run-1',
      scenario: 'cold-open',
      metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
    });
    expect(runtime.emitMetric).toHaveBeenCalledWith({
      runId: 'run-1',
      scenario: 'cold-open',
      metric: 'coldOpenMs',
      unit: 'ms',
      value: 20,
    });
    expect(runtime.onWebviewMessage).toHaveBeenCalledTimes(2);
    expect(runtime.indexGraph).toHaveBeenCalledOnce();
    expect(runtime.startMetricSession).toHaveBeenCalledWith({
      runId: 'run-1',
      scenario: 'cold-open',
    });
  });

  it('keeps the metric session active until the indexed graph settles', async () => {
    const runtime = createRuntime();
    const extensionMessageHandlers = new Set<(message: unknown) => void>();
    const webviewMessageHandlers: Array<(message: unknown) => void> = [];
    const disposeMetricSession = vi.fn();
    runtime.onExtensionMessage = vi.fn((handler) => {
      extensionMessageHandlers.add(handler);
      return { dispose: () => { extensionMessageHandlers.delete(handler); } };
    });
    runtime.onWebviewMessage = vi.fn((handler) => {
      webviewMessageHandlers.push(handler);
      return { dispose: vi.fn() };
    });
    runtime.openGraph = vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({ type: 'APP_BOOTSTRAP_COMPLETE' });
      }
    });
    runtime.indexGraph = vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
      }
    });
    runtime.startMetricSession = vi.fn(() => ({ dispose: disposeMetricSession }));

    const result = runPerfScenario({
      runId: 'run-settle',
      scenario: 'cold-open',
      startedAt: 5,
    }, runtime);
    await vi.waitFor(() => {
      expect(webviewMessageHandlers).toHaveLength(1);
    });

    webviewMessageHandlers[0]?.({ type: 'PHYSICS_STABILIZED' });
    await vi.waitFor(() => {
      expect(runtime.indexGraph).toHaveBeenCalledOnce();
      expect(webviewMessageHandlers).toHaveLength(2);
    });
    expect(disposeMetricSession).not.toHaveBeenCalled();

    webviewMessageHandlers[1]?.({ type: 'PHYSICS_STABILIZED' });
    await new Promise<void>(resolve => { setImmediate(resolve); });
    expect(disposeMetricSession).not.toHaveBeenCalled();

    for (const handler of extensionMessageHandlers) {
      handler({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
      });
    }
    await expect(result).resolves.toMatchObject({ runId: 'run-settle' });
    expect(disposeMetricSession).toHaveBeenCalledOnce();
  });

  it('labels a cached launch as warm open', async () => {
    const runtime = createRuntime();

    await expect(runPerfScenario({
      runId: 'run-2',
      scenario: 'warm-open',
      startedAt: 5,
    }, runtime)).resolves.toEqual({
      runId: 'run-2',
      scenario: 'warm-open',
      metrics: [{ metric: 'warmOpenMs', unit: 'ms', value: 20 }],
    });
    expect(runtime.indexGraph).not.toHaveBeenCalled();
    expect(runtime.onWebviewMessage).toHaveBeenCalledOnce();
  });

  it('does not label a launch warm until the cached graph is reported ready', async () => {
    const runtime = createRuntime();
    const extensionMessageHandlers = new Set<(message: unknown) => void>();
    const disposeMetricSession = vi.fn();
    runtime.onExtensionMessage = vi.fn((handler) => {
      extensionMessageHandlers.add(handler);
      return { dispose: () => { extensionMessageHandlers.delete(handler); } };
    });
    runtime.openGraph = vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
        handler({
          type: 'GRAPH_INDEX_STATUS_UPDATED',
          payload: { hasIndex: false, freshness: 'missing', detail: 'Graph Cache is missing' },
        });
        handler({ type: 'APP_BOOTSTRAP_COMPLETE' });
      }
    });
    runtime.startMetricSession = vi.fn(() => ({ dispose: disposeMetricSession }));

    const result = runPerfScenario({
      runId: 'run-warm-cache',
      scenario: 'warm-open',
      startedAt: 5,
    }, runtime);
    await new Promise<void>(resolve => { setImmediate(resolve); });

    expect(runtime.indexGraph).not.toHaveBeenCalled();
    expect(disposeMetricSession).not.toHaveBeenCalled();

    for (const handler of extensionMessageHandlers) {
      handler({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
      });
    }
    await expect(result).resolves.toMatchObject({
      runId: 'run-warm-cache',
      scenario: 'warm-open',
    });
  });
});
