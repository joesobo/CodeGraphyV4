import type { PerfMetricContext } from '@codegraphy-dev/core';
import { createExtensionPerfBridge, type ExtensionPerfBridge } from './bridge';
import type {
  PerfEventPayload,
  PerfOperation,
} from '../../shared/perf/protocol';
import type { CorrelatedGraphOperationRuntime } from './operation';

export type CorrelatedControlOperationRuntime = CorrelatedGraphOperationRuntime;

export type ControlCompletionKind =
  | 'interaction-complete'
  | 'idle-complete';

export interface CorrelatedControlOperationOptions {
  timeoutMs?: number;
}

export interface CorrelatedControlOperationResult {
  elapsedMs: number;
  event: PerfEventPayload;
}

export type StartCorrelatedControl = (
  bridge: ExtensionPerfBridge,
) => boolean;

const defaultTimeoutMs = 180_000;

function emitControlMetric(
  event: Extract<PerfEventPayload, { kind: 'metric' }>,
  emitMetric: (metric: PerfMetricContext) => void,
): void {
  emitMetric({
    operationId: event.operationId,
    runId: event.runId,
    scenario: event.scenario,
    dimension: event.dimension,
    metric: event.metric,
    value: event.value,
    unit: event.unit,
  });
}

export async function runCorrelatedControlOperation(
  operation: PerfOperation,
  completionKind: ControlCompletionKind,
  start: StartCorrelatedControl,
  runtime: CorrelatedControlOperationRuntime,
  options: CorrelatedControlOperationOptions = {},
): Promise<CorrelatedControlOperationResult> {
  let resolveCompletion: (event: PerfEventPayload) => void = () => {};
  const completion = new Promise<PerfEventPayload>((resolve) => {
    resolveCompletion = resolve;
  });
  const bridge = createExtensionPerfBridge({
    enabled: true,
    onEvent: (event) => {
      if (event.kind === 'metric') {
        emitControlMetric(event, metric => { runtime.emitMetric(metric); });
      }
      if (event.kind === completionKind) {
        resolveCompletion(event);
      }
    },
    sendControl: message => { runtime.sendControl(message); },
  });
  const subscription = runtime.onMessage(message => { bridge.handleMessage(message); });
  const metricSession = runtime.startMetricSession(operation);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(
      `Timed out waiting for ${completionKind} for ${operation.operationId}`,
    )), options.timeoutMs ?? defaultTimeoutMs);
  });
  const startedAt = runtime.now();

  try {
    if (!bridge.armGraph(operation) || !start(bridge)) {
      throw new Error(`Unable to start control operation ${operation.operationId}`);
    }
    const event = await Promise.race([completion, timeout]);
    return {
      elapsedMs: Math.max(0, runtime.now() - startedAt),
      event,
    };
  } finally {
    if (timer) clearTimeout(timer);
    bridge.disarmGraph();
    metricSession.dispose();
    subscription.dispose();
  }
}
