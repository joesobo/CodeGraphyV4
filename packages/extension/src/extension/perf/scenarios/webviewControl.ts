import {
  runCorrelatedControlOperation,
  type CorrelatedControlOperationRuntime,
} from '../controlOperation';
import { createPerfOperation } from '../operationId';

export const PERF_IDLE_WATCH_DURATION_MS = 60_000;

export interface RunWebviewControlScenarioInput {
  dimension: string;
  ordinal: number;
  runId: string;
}

export interface RunIdleWatchScenarioInput extends RunWebviewControlScenarioInput {
  durationMs?: number;
}

export interface WebviewControlScenarioDependencies {
  runControlOperation: typeof runCorrelatedControlOperation;
}

const defaultDependencies: WebviewControlScenarioDependencies = {
  runControlOperation: runCorrelatedControlOperation,
};

export async function runInteractionBurstScenario(
  input: RunWebviewControlScenarioInput,
  runtime: CorrelatedControlOperationRuntime,
  dependencies: WebviewControlScenarioDependencies = defaultDependencies,
): Promise<{
    dimension: string;
    durationMs: number;
    operationId: string;
    scenario: 'interaction-burst';
  }> {
  const operation = createPerfOperation({
    ...input,
    scenario: 'interaction-burst',
  });
  const result = await dependencies.runControlOperation(
    operation,
    'interaction-complete',
    bridge => bridge.runInteractionBurst(),
    runtime,
  );
  if (result.event.kind !== 'interaction-complete') {
    throw new Error(`Unexpected interaction result for ${operation.operationId}`);
  }
  return {
    dimension: input.dimension,
    durationMs: result.event.durationMs,
    operationId: operation.operationId,
    scenario: 'interaction-burst',
  };
}

export async function runIdleWatchScenario(
  input: RunIdleWatchScenarioInput,
  runtime: CorrelatedControlOperationRuntime,
  dependencies: WebviewControlScenarioDependencies = defaultDependencies,
): Promise<{
    dimension: string;
    durationMs: number;
    operationId: string;
    scenario: 'idle-watch';
  }> {
  const durationMs = input.durationMs ?? PERF_IDLE_WATCH_DURATION_MS;
  const operation = createPerfOperation({
    ...input,
    scenario: 'idle-watch',
  });
  const result = await dependencies.runControlOperation(
    operation,
    'idle-complete',
    bridge => bridge.runIdleWatch(durationMs),
    runtime,
  );
  if (result.event.kind !== 'idle-complete') {
    throw new Error(`Unexpected idle result for ${operation.operationId}`);
  }
  return {
    dimension: input.dimension,
    durationMs: result.event.durationMs,
    operationId: operation.operationId,
    scenario: 'idle-watch',
  };
}
