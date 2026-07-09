import type {
  PerfMetricContext,
  PerfMetricSessionContext,
} from '@codegraphy-dev/core';
import { createExtensionPerfBridge } from './bridge';
import type {
  PerfControlMessage,
  PerfEventPayload,
  PerfOperation,
} from '../../shared/perf/protocol';

type GraphAppliedEvent = Extract<PerfEventPayload, { kind: 'graph-applied' }>;

export interface PerfOperationDisposable {
  dispose(): void;
}

export interface CorrelatedGraphOperationRuntime {
  emitMetric(metric: PerfMetricContext): void;
  now(): number;
  onMessage(handler: (message: unknown) => void): PerfOperationDisposable;
  sendControl(message: PerfControlMessage): void;
  startMetricSession(context: PerfMetricSessionContext): PerfOperationDisposable;
}

export interface CorrelatedGraphOperationOptions {
  timeoutMs?: number;
}

export interface CorrelatedGraphOperationResult {
  elapsedMs: number;
  graphAppliedMs: number;
  graphApplied: GraphAppliedEvent;
}

interface GraphAcknowledgement {
  promise: Promise<GraphAppliedEvent>;
  receive(event: PerfEventPayload): void;
}

const defaultTimeoutMs = 180_000;

function createGraphAcknowledgement(
  emitMetric: (metric: PerfMetricContext) => void,
  onGraphApplied: () => void,
): GraphAcknowledgement {
  let applied: GraphAppliedEvent | undefined;
  let physicsSettled = false;
  let resolve: (event: GraphAppliedEvent) => void = () => {};
  const promise = new Promise<GraphAppliedEvent>((complete) => {
    resolve = complete;
  });

  const completeWhenReady = (): void => {
    if (applied && (!applied.layoutChanged || physicsSettled)) {
      resolve(applied);
    }
  };

  return {
    promise,
    receive(event): void {
      if (event.kind === 'metric') {
        emitMetric({
          operationId: event.operationId,
          runId: event.runId,
          scenario: event.scenario,
          dimension: event.dimension,
          metric: event.metric,
          value: event.value,
          unit: event.unit,
        });
        return;
      }
      if (event.kind === 'graph-applied') {
        onGraphApplied();
        applied = event;
        completeWhenReady();
        return;
      }
      if (event.kind === 'physics-settled') {
        physicsSettled = true;
        completeWhenReady();
      }
    },
  };
}

function timeoutAfter(operationId: string, timeoutMs: number): {
  promise: Promise<never>;
  dispose(): void;
} {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(
        `Timed out waiting for graph acknowledgement for ${operationId}`,
      ));
    }, timeoutMs);
  });

  return {
    promise,
    dispose(): void {
      if (timer) clearTimeout(timer);
    },
  };
}

export async function runCorrelatedGraphOperation(
  operation: PerfOperation,
  action: () => Promise<void>,
  runtime: CorrelatedGraphOperationRuntime,
  options: CorrelatedGraphOperationOptions = {},
): Promise<CorrelatedGraphOperationResult> {
  let graphAppliedAt: number | undefined;
  const acknowledgement = createGraphAcknowledgement(
    metric => { runtime.emitMetric(metric); },
    () => { graphAppliedAt ??= runtime.now(); },
  );
  const bridge = createExtensionPerfBridge({
    enabled: true,
    onEvent: event => { acknowledgement.receive(event); },
    sendControl: message => { runtime.sendControl(message); },
  });
  const subscription = runtime.onMessage(message => { bridge.handleMessage(message); });
  const metricSession = runtime.startMetricSession(operation);
  const timeout = timeoutAfter(
    operation.operationId,
    options.timeoutMs ?? defaultTimeoutMs,
  );
  const startedAt = runtime.now();

  try {
    if (!bridge.armGraph(operation)) {
      throw new Error(`Unable to arm graph operation ${operation.operationId}`);
    }

    const graphApplied = await Promise.race([
      (async () => {
        await action();
        return acknowledgement.promise;
      })(),
      timeout.promise,
    ]);

    return {
      elapsedMs: Math.max(0, runtime.now() - startedAt),
      graphAppliedMs: Math.max(0, (graphAppliedAt ?? startedAt) - startedAt),
      graphApplied,
    };
  } finally {
    timeout.dispose();
    bridge.disarmGraph();
    metricSession.dispose();
    subscription.dispose();
  }
}
