import { useEffect, useRef, type MutableRefObject } from 'react';
import type {
  GraphPerfLifecycle,
  GraphCommitInput,
} from './lifecycle';
import { webviewGraphPerfLifecycle } from './lifecycle';

interface GraphPerfCommitInput extends GraphCommitInput {
  enabled?: boolean;
  revision: object;
  simulationEnabled?: boolean;
}

interface GraphPerfCommitDependencies {
  cancelFrame: (frame: number) => void;
  lifecycle: Pick<GraphPerfLifecycle, 'prepareCommit' | 'publishCommit'>
    & Partial<Pick<GraphPerfLifecycle, 'engineStopped'>>;
  requestFrame: (callback: FrameRequestCallback) => number;
}

const defaultDependencies: GraphPerfCommitDependencies = {
  cancelFrame: frame => cancelAnimationFrame(frame),
  lifecycle: webviewGraphPerfLifecycle,
  requestFrame: callback => requestAnimationFrame(callback),
};

interface PendingGraphCommit {
  commit: ReturnType<GraphPerfLifecycle['prepareCommit']> & object;
  frame: number;
  timer: ReturnType<typeof setTimeout>;
  token: object;
}

const GRAPH_COMMIT_FRAME_BUDGET_MS = 16;

function cancelPendingGraphCommit(
  pendingRef: MutableRefObject<PendingGraphCommit | undefined>,
  cancelFrame: GraphPerfCommitDependencies['cancelFrame'],
): void {
  const pending = pendingRef.current;
  if (!pending) return;
  pendingRef.current = undefined;
  cancelFrame(pending.frame);
  clearTimeout(pending.timer);
}

function enqueueGraphCommit(
  commit: PendingGraphCommit['commit'],
  pendingRef: MutableRefObject<PendingGraphCommit | undefined>,
  dependencies: GraphPerfCommitDependencies,
  simulationEnabled: boolean,
): void {
  const pending = pendingRef.current;
  if (pending) {
    pending.commit = {
      ...commit,
      layoutChanged: pending.commit.layoutChanged || commit.layoutChanged,
    };
    return;
  }
  const token = {};
  const publish = () => {
    const next = pendingRef.current;
    if (next?.token !== token) return;
    pendingRef.current = undefined;
    dependencies.cancelFrame(next.frame);
    clearTimeout(next.timer);
    const published = dependencies.lifecycle.publishCommit(next.commit);
    if (published && next.commit.layoutChanged && !simulationEnabled) {
      dependencies.lifecycle.engineStopped?.();
    }
  };
  const frame = dependencies.requestFrame(publish);
  const timer = setTimeout(publish, GRAPH_COMMIT_FRAME_BUDGET_MS);
  pendingRef.current = { commit, frame, timer, token };
}

function prepareObservedGraphCommit(
  input: GraphCommitInput,
  lifecycle: GraphPerfCommitDependencies['lifecycle'],
): PendingGraphCommit['commit'] | undefined {
  return lifecycle.prepareCommit(input);
}

function canPublishStableScopeCommit(
  commit: PendingGraphCommit['commit'],
): boolean {
  return commit.operation.scenario === 'scope-toggle'
    && !commit.layoutChanged
    && commit.scopeVisibility !== undefined;
}

export function useGraphPerfCommit(
  {
    edgeCount,
    enabled = true,
    layoutKey,
    nodeCount,
    revision,
    scopeProjectionRevision,
    scopeVisibility,
    simulationEnabled = true,
  }: GraphPerfCommitInput,
  dependencies: GraphPerfCommitDependencies = defaultDependencies,
): void {
  const { cancelFrame, lifecycle, requestFrame } = dependencies;
  const pendingRef = useRef<PendingGraphCommit | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      cancelPendingGraphCommit(pendingRef, cancelFrame);
      return;
    }

    const commit = prepareObservedGraphCommit({
      edgeCount,
      layoutKey,
      nodeCount,
      scopeProjectionRevision,
      ...(scopeVisibility ? { scopeVisibility } : {}),
    }, lifecycle);
    if (!commit) {
      cancelPendingGraphCommit(pendingRef, cancelFrame);
      return;
    }
    if (!pendingRef.current && canPublishStableScopeCommit(commit)) {
      lifecycle.publishCommit(commit);
      return;
    }
    enqueueGraphCommit(commit, pendingRef, {
      cancelFrame,
      lifecycle,
      requestFrame,
    }, simulationEnabled);
  }, [
    cancelFrame,
    edgeCount,
    enabled,
    layoutKey,
    lifecycle,
    nodeCount,
    requestFrame,
    revision,
    scopeProjectionRevision,
    scopeVisibility,
    simulationEnabled,
  ]);

  useEffect(() => () => {
    cancelPendingGraphCommit(pendingRef, cancelFrame);
  }, [cancelFrame]);
}
