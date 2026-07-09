import type { PerfScenario } from '../../shared/perf/protocol';
import {
  runCorrelatedGraphOperation,
  type CorrelatedGraphOperationRuntime,
} from './operation';
import type { PerfScenarioOperationRunner } from './scenarios/contracts';

type RunCorrelatedGraphOperation = typeof runCorrelatedGraphOperation;

function recordsFileOperationRoundtrip(scenario: PerfScenario): boolean {
  return scenario === 'rename'
    || scenario === 'create'
    || scenario === 'delete';
}

export function createPerfScenarioOperationRunner(
  runtime: CorrelatedGraphOperationRuntime,
  runGraphOperation: RunCorrelatedGraphOperation = runCorrelatedGraphOperation,
): PerfScenarioOperationRunner {
  return async (operation, action) => {
    const result = await runGraphOperation(operation, action, runtime);
    if (recordsFileOperationRoundtrip(operation.scenario)) {
      runtime.emitMetric({
        operationId: operation.operationId,
        runId: operation.runId,
        scenario: operation.scenario,
        dimension: operation.dimension,
        metric: 'fileOpRoundtripMs',
        unit: 'ms',
        value: result.graphAppliedMs,
      });
    }
    return result;
  };
}
