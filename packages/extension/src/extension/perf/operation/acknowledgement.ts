import type { PerfMetricContext } from '@codegraphy-dev/core';
import type { PerfEventPayload } from '../../../shared/perf/protocol';

export type GraphAppliedEvent = Extract<PerfEventPayload, { kind: 'graph-applied' }>;

export interface GraphAcknowledgement {
  promise: Promise<GraphAppliedEvent>;
  receive(event: PerfEventPayload): void;
}

interface AppliedGraphAcknowledgement {
  event: GraphAppliedEvent;
  physicsSettled: boolean;
}

export function createGraphAcknowledgement(
  emitMetric: (metric: PerfMetricContext) => void,
  onGraphApplied: () => void,
): GraphAcknowledgement {
  let applied: AppliedGraphAcknowledgement | undefined;
  let resolve: (event: GraphAppliedEvent) => void = () => {};
  const promise = new Promise<GraphAppliedEvent>((complete) => {
    resolve = complete;
  });

  const completeWhenReady = (): void => {
    if (applied && (!applied.event.layoutChanged || applied.physicsSettled)) {
      resolve(applied.event);
    }
  };

  return {
    promise,
    receive(event): void {
      switch (event.kind) {
        case 'metric':
          emitMetric({
            operationId: event.operationId,
            runId: event.runId,
            scenario: event.scenario,
            dimension: event.dimension,
            metric: event.metric,
            value: event.value,
            unit: event.unit,
          });
          break;
        case 'graph-applied':
          onGraphApplied();
          applied = { event, physicsSettled: false };
          completeWhenReady();
          break;
        case 'physics-settled':
          if (event.scopeProjectionRevision !== applied?.event.scopeProjectionRevision) return;
          applied.physicsSettled = true;
          completeWhenReady();
          break;
      }
    },
  };
}
