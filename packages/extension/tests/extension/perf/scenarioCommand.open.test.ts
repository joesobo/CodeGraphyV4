import { describe, expect, it, vi } from 'vitest';
import {
  runPerfScenario,
  type PerfScenarioRuntime,
} from '../../../src/extension/perf/scenarioCommand';

function createRuntime(): PerfScenarioRuntime {
  const extensionMessageHandlers = new Set<(message: unknown) => void>();
  const webviewMessageHandlers = new Set<(message: unknown) => void>();
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
      webviewMessageHandlers.add(handler);
      return { dispose: () => { webviewMessageHandlers.delete(handler); } };
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
    requestRenderReady: vi.fn((request: { graphRevision: number; requestId: string }) => {
      for (const handler of webviewMessageHandlers) {
        handler({
          type: 'PERF_RENDER_READY',
          payload: {
            graphRevision: request.graphRevision,
            requestId: request.requestId,
            nodeCount: 1,
            edgeCount: 1,
          },
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
      dimension: 'small',
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
    expect(runtime.requestRenderReady).toHaveBeenCalledTimes(2);
    expect(runtime.indexGraph).toHaveBeenCalledOnce();
    expect(runtime.startMetricSession).toHaveBeenCalledWith({
      runId: 'run-1',
      scenario: 'cold-open',
      dimension: 'small',
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
        handler({
          type: 'GRAPH_DATA_UPDATED',
          graphRevision: 10,
          payload: { nodes: [], edges: [] },
        });
        handler({ type: 'APP_BOOTSTRAP_COMPLETE' });
      }
    });
    runtime.indexGraph = vi.fn(async () => {
      for (const handler of extensionMessageHandlers) {
        handler({
          type: 'GRAPH_DATA_UPDATED',
          graphRevision: 20,
          payload: { nodes: [], edges: [] },
        });
      }
    });
    runtime.startMetricSession = vi.fn(() => ({ dispose: disposeMetricSession }));
    runtime.requestRenderReady = vi.fn();

    const result = runPerfScenario({
      runId: 'run-settle',
      scenario: 'cold-open',
      dimension: 'small',
      startedAt: 5,
    }, runtime);
    await vi.waitFor(() => {
      expect(runtime.requestRenderReady).toHaveBeenCalledOnce();
    });
    webviewMessageHandlers[0]?.({ type: 'PHYSICS_STABILIZED' });
    webviewMessageHandlers[0]?.({
      type: 'PERF_RENDER_READY',
      payload: { requestId: 'stale', nodeCount: 0, edgeCount: 0 },
    });
    await new Promise<void>(resolve => { setImmediate(resolve); });
    expect(runtime.indexGraph).not.toHaveBeenCalled();

    const initialRequest = vi.mocked(runtime.requestRenderReady).mock.calls[0]?.[0];
    webviewMessageHandlers[0]?.({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 9,
        requestId: initialRequest?.requestId,
        nodeCount: 1,
        edgeCount: 0,
      },
    });
    await new Promise<void>(resolve => { setImmediate(resolve); });
    expect(runtime.indexGraph).not.toHaveBeenCalled();

    webviewMessageHandlers[0]?.({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 10,
        requestId: initialRequest?.requestId,
        nodeCount: 1,
        edgeCount: 0,
      },
    });
    await vi.waitFor(() => {
      expect(runtime.indexGraph).toHaveBeenCalledOnce();
    });
    for (const handler of extensionMessageHandlers) {
      handler({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
      });
    }
    await vi.waitFor(() => {
      expect(runtime.requestRenderReady).toHaveBeenCalledTimes(2);
    });
    expect(disposeMetricSession).not.toHaveBeenCalled();

    const indexedRequest = vi.mocked(runtime.requestRenderReady).mock.calls[1]?.[0];
    webviewMessageHandlers[1]?.({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 20,
        requestId: indexedRequest?.requestId,
        nodeCount: 0,
        edgeCount: 0,
      },
    });
    await new Promise<void>(resolve => { setImmediate(resolve); });
    await expect(result).resolves.toMatchObject({ runId: 'run-settle' });
    expect(disposeMetricSession).toHaveBeenCalledOnce();
  });

  it('labels a cached launch as warm open', async () => {
    const runtime = createRuntime();

    await expect(runPerfScenario({
      runId: 'run-2',
      scenario: 'warm-open',
      dimension: 'small',
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
        handler({
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'src/index.ts' }],
            edges: [{ source: 'src/index.ts', target: 'src/lib.ts' }],
          },
        });
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
      dimension: 'small',
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

  it('aggregates high-volume Core metrics in an open result', async () => {
    const runtime = createRuntime();
    runtime.startMetricSession = vi.fn(() => {
      runtime.emitMetric({
        runId: 'run-aggregate',
        scenario: 'cold-open',
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 2,
        dimension: 'typescript',
      });
      runtime.emitMetric({
        runId: 'run-foreign',
        scenario: 'cold-open',
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 100,
        dimension: 'typescript',
      });
      runtime.emitMetric({
        runId: 'run-aggregate',
        scenario: 'cold-open',
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 11,
        dimension: 'workspace-pipeline-analysis',
      });
      runtime.emitMetric({
        runId: 'run-aggregate',
        scenario: 'cold-open',
        metric: 'cacheBytes',
        unit: 'bytes',
        value: 4_096,
      });
      runtime.emitMetric({
        runId: 'run-aggregate',
        scenario: 'cold-open',
        metric: 'cacheSaveMs',
        unit: 'ms',
        value: 4,
      });
      runtime.emitMetric({
        runId: 'run-aggregate',
        scenario: 'cold-open',
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 5,
        dimension: 'typescript',
      });
      return { dispose: vi.fn() };
    });

    await expect(runPerfScenario({
      runId: 'run-aggregate',
      scenario: 'cold-open',
      dimension: 'small',
      startedAt: 5,
    }, runtime)).resolves.toEqual({
      runId: 'run-aggregate',
      scenario: 'cold-open',
      metrics: [
        { metric: 'coldOpenMs', unit: 'ms', value: 20 },
        { metric: 'cacheSaveMs', unit: 'ms', value: 4 },
        { metric: 'cacheBytes', unit: 'bytes', value: 4_096 },
        {
          metric: 'treeSitterParseMs',
          unit: 'ms',
          value: 7,
          dimension: 'typescript',
        },
        {
          metric: 'graphBuildMs',
          unit: 'ms',
          value: 11,
          dimension: 'workspace-pipeline-analysis',
        },
      ],
    });
  });
});
