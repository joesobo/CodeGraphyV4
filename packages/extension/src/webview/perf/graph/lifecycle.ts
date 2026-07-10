import type {
  PerfEventInput,
  PerfOperation,
  PerfScopeVisibilitySnapshot,
} from '../../../shared/perf/protocol';
import { webviewPerfBridge } from '../bridge';
import { graphLayoutChanged } from './lifecycle/layout';

interface GraphPerfBridge {
  emit(event: PerfEventInput): boolean;
  emitFor(operation: PerfOperation, event: PerfEventInput): boolean;
  getArmedOperation(): PerfOperation | undefined;
}

export interface GraphCommitInput {
  edgeCount: number;
  layoutKey: string | undefined;
  nodeCount: number;
  scopeProjectionRevision?: number;
  scopeVisibility?: PerfScopeVisibilitySnapshot;
}

export interface PreparedGraphCommit extends GraphCommitInput {
  layoutChanged: boolean;
  operation: PerfOperation;
  scopeProjectionRevision: number;
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
  scopeProjectionRevision: number;
  startedAt: number;
}

class DefaultGraphPerfLifecycle implements GraphPerfLifecycle {
  private pendingSettle: PendingSettle | undefined;
  private previousLayoutKey: string | undefined;

  constructor(private readonly options: GraphPerfLifecycleOptions) {}

  engineStopped(): boolean {
    const settle = this.pendingSettle;
    this.pendingSettle = undefined;
    if (!settle) return false;
    const emittedDuration = this.options.bridge.emitFor(settle.operation, {
      kind: 'metric',
      metric: 'settleTimeMs',
      unit: 'ms',
      value: Math.max(0, this.options.now() - settle.startedAt),
    });
    if (!emittedDuration) return false;
    return this.options.bridge.emitFor(settle.operation, {
      kind: 'physics-settled',
      scopeProjectionRevision: settle.scopeProjectionRevision,
    });
  }

  layoutReset(): boolean {
    return this.options.bridge.emit({
      kind: 'metric',
      metric: 'layoutResets',
      unit: 'count',
      value: 1,
    });
  }

  prepareCommit(input: GraphCommitInput): PreparedGraphCommit | undefined {
    const operation = this.options.bridge.getArmedOperation();
    const layoutChanged = graphLayoutChanged(input.layoutKey, this.previousLayoutKey);
    if (!operation) {
      this.previousLayoutKey = input.layoutKey;
      return undefined;
    }
    return {
      ...input,
      layoutChanged,
      operation,
      scopeProjectionRevision: input.scopeProjectionRevision ?? 0,
    };
  }

  publishCommit(commit: PreparedGraphCommit): boolean {
    this.previousLayoutKey = commit.layoutKey;
    const emitted = this.options.bridge.emitFor(commit.operation, {
      kind: 'graph-applied',
      layoutChanged: commit.layoutChanged,
      nodeCount: commit.nodeCount,
      edgeCount: commit.edgeCount,
      scopeProjectionRevision: commit.scopeProjectionRevision,
      ...(commit.scopeVisibility ? { scopeVisibility: commit.scopeVisibility } : {}),
    });
    if (!emitted) return false;
    if (commit.layoutChanged) this.pendingSettle = this.createPendingSettle(commit);
    return true;
  }

  private createPendingSettle(commit: PreparedGraphCommit): PendingSettle {
    return {
      operation: commit.operation,
      scopeProjectionRevision: commit.scopeProjectionRevision,
      startedAt: this.options.now(),
    };
  }
}

export function createGraphPerfLifecycle(
  options: GraphPerfLifecycleOptions,
): GraphPerfLifecycle {
  return new DefaultGraphPerfLifecycle(options);
}

export const webviewGraphPerfLifecycle = createGraphPerfLifecycle({
  bridge: webviewPerfBridge,
  now: () => performance.now(),
});
