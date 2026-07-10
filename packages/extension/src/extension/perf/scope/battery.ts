import type { CorrelatedControlOperationRuntime } from '../controlOperation';
import { createPerfOperation } from '../operationId';
import { scopeToggleRepetitions } from './battery/execution';
import { createScopeBatterySession } from './battery/session';

const defaultTimeoutMs = 180_000;

export interface RunScopeToggleScenarioInput {
  dimension: string;
  ordinal: number;
  runId: string;
}

export interface RunScopeToggleScenarioOptions {
  timeoutMs?: number;
}

export interface ScopeToggleScenarioResult {
  dimension: string;
  entryCount: number;
  operationId: string;
  scenario: 'scope-toggle';
  /** Measured toggles only; preconditioning and restoration are excluded. */
  toggleCount: number;
}

export async function runScopeToggleScenario(
  input: RunScopeToggleScenarioInput,
  runtime: CorrelatedControlOperationRuntime,
  options: RunScopeToggleScenarioOptions = {},
): Promise<ScopeToggleScenarioResult> {
  const operation = createPerfOperation({
    dimension: input.dimension,
    ordinal: input.ordinal,
    runId: input.runId,
    scenario: 'scope-toggle',
  });
  const run = createScopeBatterySession(
    input,
    operation,
    runtime,
    options.timeoutMs ?? defaultTimeoutMs,
  );

  try {
    const entries = await run.execute();
    return {
      dimension: input.dimension,
      entryCount: entries.length,
      operationId: operation.operationId,
      scenario: 'scope-toggle',
      toggleCount: entries.length * scopeToggleRepetitions * 2,
    };
  } finally {
    run.dispose();
  }
}
