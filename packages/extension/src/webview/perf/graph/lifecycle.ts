import type {
  PerfEventInput,
  PerfOperation,
  PerfScopeVisibilitySnapshot,
} from '../../../shared/perf/protocol';
import { webviewPerfBridge } from '../bridge';

interface GraphPerfBridge {
  emit(event: PerfEventInput): boolean;
  emitFor(operation: PerfOperation, event: PerfEventInput): boolean;
  getArmedOperation(): PerfOperation | undefined;
}

export interface GraphCommitInput {
  edgeCount: number;
  layoutKey: string | undefined;
  nodeCount: number;
  scopeVisibility?: PerfScopeVisibilitySnapshot;
}

export interface PreparedGraphCommit extends GraphCommitInput {
  layoutChanged: boolean;
  operation: PerfOperation;
}

export interface GraphPerfLifecycle {
  engineStopped: () => boolean;
  layoutReset: () => boolean;
  prepareCommit: (input: GraphCommitInput) => PreparedGraphCommit | undefined;
  publishCommit: (commit: PreparedGraphCommit) => boolean;
}

interface GraphPerfLifecycleOptions {
  bridge: GraphPerfBridge;
  now: () => number;
}

interface PendingSettle {
  operation: PerfOperation;
  startedAt: number;
}

export function createGraphPerfLifecycle({
  bridge,
  now,
}: GraphPerfLifecycleOptions): GraphPerfLifecycle {
  let previousLayoutKey: string | undefined;
  let pendingSettle: PendingSettle | undefined;

  return {
    engineStopped(): boolean {
      const settle = pendingSettle;
      pendingSettle = undefined;
      if (!settle) {
        return false;
      }

      const emittedDuration = bridge.emitFor(settle.operation, {
        kind: 'metric',
        metric: 'settleTimeMs',
        unit: 'ms',
        value: Math.max(0, now() - settle.startedAt),
      });
      if (!emittedDuration) {
        return false;
      }

      return bridge.emitFor(settle.operation, { kind: 'physics-settled' });
    },

    layoutReset(): boolean {
      return bridge.emit({
        kind: 'metric',
        metric: 'layoutResets',
        unit: 'count',
        value: 1,
      });
    },

    prepareCommit(input): PreparedGraphCommit | undefined {
      const operation = bridge.getArmedOperation();
      const layoutChanged = input.layoutKey !== undefined
        && input.layoutKey !== previousLayoutKey;

      if (!operation) {
        previousLayoutKey = input.layoutKey;
        return undefined;
      }

      return {
        ...input,
        layoutChanged,
        operation,
      };
    },

    publishCommit(commit): boolean {
      previousLayoutKey = commit.layoutKey;
      const emitted = bridge.emitFor(commit.operation, {
        kind: 'graph-applied',
        layoutChanged: commit.layoutChanged,
        nodeCount: commit.nodeCount,
        edgeCount: commit.edgeCount,
        ...(commit.scopeVisibility
          ? { scopeVisibility: commit.scopeVisibility }
          : {}),
      });
      if (!emitted) {
        return false;
      }

      if (commit.layoutChanged) {
        pendingSettle = {
          operation: commit.operation,
          startedAt: now(),
        };
      }
      return true;
    },
  };
}

export const webviewGraphPerfLifecycle = createGraphPerfLifecycle({
  bridge: webviewPerfBridge,
  now: () => performance.now(),
});
