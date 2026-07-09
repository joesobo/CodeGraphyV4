import { useEffect } from 'react';
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

export function useGraphPerfCommit(
  {
    edgeCount,
    enabled = true,
    layoutKey,
    nodeCount,
    revision,
  }: GraphPerfCommitInput,
  dependencies: GraphPerfCommitDependencies = defaultDependencies,
): void {
  const { cancelFrame, lifecycle, requestFrame } = dependencies;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const commit = lifecycle.prepareCommit({ edgeCount, layoutKey, nodeCount });
    if (!commit) {
      return undefined;
    }

    const frame = requestFrame(() => lifecycle.publishCommit(commit));
    return () => cancelFrame(frame);
  }, [cancelFrame, edgeCount, enabled, layoutKey, lifecycle, nodeCount, requestFrame, revision]);
}
