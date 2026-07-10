import type { PerfEventPayload } from '../../../../../shared/perf/protocol';

export type GraphAppliedEvent = Extract<
  PerfEventPayload,
  { kind: 'graph-applied' }
>;
export type PhysicsSettledEvent = Extract<
  PerfEventPayload,
  { kind: 'physics-settled' }
>;

export interface AppliedProjection {
  elapsedMs: number;
  event: GraphAppliedEvent;
  physicsSettled: boolean;
}

export interface ToggleWaiterState {
  graphApplied: GraphAppliedEvent | undefined;
  graphAppliedElapsedMs: number | undefined;
  graphAppliedPhysicsSettled: boolean;
  graphAppliedRevisions: Map<number, AppliedProjection>;
  persisted: boolean;
  scopeProjectionRevision: number;
  toggled: boolean;
}

export function createToggleWaiterState(): ToggleWaiterState {
  return {
    graphApplied: undefined,
    graphAppliedElapsedMs: undefined,
    graphAppliedPhysicsSettled: false,
    graphAppliedRevisions: new Map(),
    persisted: false,
    scopeProjectionRevision: -1,
    toggled: false,
  };
}
