import type {
  PerfMetricContext,
  PerfMetricSessionContext,
} from '@codegraphy-dev/core';
import { createExtensionPerfBridge } from './bridge';
import type {
  PerfControlMessage,
  PerfOperation,
} from '../../shared/perf/protocol';
import {
  createGraphAcknowledgement,
  type GraphAppliedEvent,
} from './operation/acknowledgement';
import { timeoutAfter } from './operation/timeout';


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

const defaultTimeoutMs = 180_000;

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
    () => graphAppliedAt === undefined
      ? 'graph application'
      : 'physics settlement',
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
