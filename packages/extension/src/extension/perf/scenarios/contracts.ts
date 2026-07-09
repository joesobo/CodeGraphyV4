import type { PerfOperation } from '../../../shared/perf/protocol';

export type PerfScenarioOperationRunner = (
  operation: PerfOperation,
  action: () => Promise<void>,
) => Promise<unknown>;
