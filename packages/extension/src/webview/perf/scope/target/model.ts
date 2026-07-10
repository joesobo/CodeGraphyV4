import type {
  PerfOperation,
  PerfScopeEntry,
} from '../../../../shared/perf/protocol';
import type { WebviewPerfBridge } from '../../bridge';

export interface ScopePerfTargetOptions {
  applyVisibility: (entry: PerfScopeEntry, onPosted?: () => void) => boolean;
  bridge: Pick<WebviewPerfBridge, 'emitFor'>;
  cancelFrame: (frame: number) => void;
  getInventory: () => PerfScopeEntry[];
  getProjectionRevision: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
}

export interface PendingScopeToggle {
  entry: PerfScopeEntry;
  frame: number | undefined;
  operation: PerfOperation;
  projectionRevision: number;
  persisted: boolean;
  posted: boolean;
  toggled: boolean;
}

export function createPendingScopeToggle(
  operation: PerfOperation,
  entry: PerfScopeEntry,
): PendingScopeToggle {
  return {
    entry,
    frame: undefined,
    operation,
    projectionRevision: 0,
    persisted: false,
    posted: false,
    toggled: false,
  };
}
