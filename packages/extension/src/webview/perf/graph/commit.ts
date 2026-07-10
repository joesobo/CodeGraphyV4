import { useEffect, useRef } from 'react';
import type {
  GraphPerfLifecycle,
  GraphCommitInput,
} from './lifecycle';
import { webviewGraphPerfLifecycle } from './lifecycle';

interface GraphPerfCommitInput extends GraphCommitInput {
  enabled?: boolean;
  revision: object;
}

interface GraphPerfCommitDependencies {
  cancelFrame: (frame: number) => void;
  lifecycle: Pick<GraphPerfLifecycle, 'prepareCommit' | 'publishCommit'>;
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
}

export function useGraphPerfCommit(
  {
    edgeCount,
    enabled = true,
    layoutKey,
    nodeCount,
    revision,
    scopeVisibility,
  }: GraphPerfCommitInput,
  dependencies: GraphPerfCommitDependencies = defaultDependencies,
): void {
  const { cancelFrame, lifecycle, requestFrame } = dependencies;
  const pendingRef = useRef<PendingGraphCommit | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = undefined;
        cancelFrame(pending.frame);
      }
      return;
    }

    const commit = lifecycle.prepareCommit({
      edgeCount,
      layoutKey,
      nodeCount,
      ...(scopeVisibility ? { scopeVisibility } : {}),
    });
    if (!commit) {
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = undefined;
        cancelFrame(pending.frame);
      }
      return;
    }

    const pending = pendingRef.current;
    if (pending) {
      pending.commit = commit;
      return;
    }

    const next: PendingGraphCommit = { commit, frame: -1 };
    pendingRef.current = next;
    next.frame = requestFrame(() => {
      if (pendingRef.current !== next) return;
      pendingRef.current = undefined;
      lifecycle.publishCommit(next.commit);
    });
  }, [
    cancelFrame,
    edgeCount,
    enabled,
    layoutKey,
    lifecycle,
    nodeCount,
    requestFrame,
    revision,
    scopeVisibility,
  ]);

  useEffect(() => () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = undefined;
    cancelFrame(pending.frame);
  }, [cancelFrame]);
}
