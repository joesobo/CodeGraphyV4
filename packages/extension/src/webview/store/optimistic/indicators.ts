import { useEffect, type MutableRefObject } from 'react';
import type { NodeDecorationPayload } from '../../../shared/plugins/decorations';
import { mergeNodeDecorationMaps } from '../../nativeDecorations/model';
import type { GraphCommitInput, GraphPerfLifecycle } from '../../perf/graph/lifecycle';
import { webviewGraphPerfLifecycle } from '../../perf/graph/lifecycle';
import type { GraphState } from '../state';
import { applyPendingFileMutationDecorations } from './decorations';

type OptimisticIndicatorState = Pick<
  GraphState,
  | 'graphData'
  | 'nativeNodeDecorations'
  | 'nodeDecorations'
  | 'pendingFileMutations'
>;

interface OptimisticIndicatorGraph {
  zoom?(): number;
  zoom?(scale: number, durationMs?: number): void;
}

interface OptimisticIndicatorUpdateOptions {
  current: OptimisticIndicatorState;
  graph: OptimisticIndicatorGraph | undefined;
  graphCommitInput: GraphCommitInput;
  lifecycle: Pick<GraphPerfLifecycle, 'prepareCommit' | 'publishCommit'>;
  nodeDecorationsRef: MutableRefObject<Record<string, NodeDecorationPayload> | undefined>;
  previous: OptimisticIndicatorState;
}

type OptimisticIndicatorTarget = (
  current: OptimisticIndicatorState,
  previous: OptimisticIndicatorState,
) => void;

let optimisticIndicatorTarget: OptimisticIndicatorTarget | undefined;

export function attachOptimisticFileMutationIndicatorTarget(
  target: OptimisticIndicatorTarget,
): () => void {
  optimisticIndicatorTarget = target;
  return () => {
    if (optimisticIndicatorTarget === target) optimisticIndicatorTarget = undefined;
  };
}

export function notifyOptimisticFileMutationIndicatorTarget(
  current: OptimisticIndicatorState,
  previous: OptimisticIndicatorState,
): void {
  optimisticIndicatorTarget?.(current, previous);
}

function hasNewPendingMutation(
  current: OptimisticIndicatorState['pendingFileMutations'],
  previous: OptimisticIndicatorState['pendingFileMutations'],
): boolean {
  return Object.keys(current).some(mutationId => previous[mutationId] === undefined);
}

function isStableFileMutationCommit(
  commit: ReturnType<GraphPerfLifecycle['prepareCommit']> & object,
): boolean {
  return !commit.layoutChanged
    && (
      commit.operation.scenario === 'rename'
      || commit.operation.scenario === 'create'
      || commit.operation.scenario === 'delete'
    );
}

export function applyOptimisticFileMutationIndicatorUpdate({
  current,
  graph,
  graphCommitInput,
  lifecycle,
  nodeDecorationsRef,
  previous,
}: OptimisticIndicatorUpdateOptions): boolean {
  if (current.pendingFileMutations === previous.pendingFileMutations) return false;

  const decorations = applyPendingFileMutationDecorations(
    mergeNodeDecorationMaps(
      current.nodeDecorations,
      current.nativeNodeDecorations,
    ),
    current.graphData,
    current.pendingFileMutations,
  );
  nodeDecorationsRef.current = decorations;
  const scale = graph?.zoom?.();
  if (scale === undefined) return false;
  graph?.zoom?.(scale, 0);

  if (!hasNewPendingMutation(
    current.pendingFileMutations,
    previous.pendingFileMutations,
  )) {
    return true;
  }
  const commit = lifecycle.prepareCommit(graphCommitInput);
  if (commit && isStableFileMutationCommit(commit)) {
    lifecycle.publishCommit(commit);
  }
  return true;
}

export function useOptimisticFileMutationIndicators({
  graphCommitInput,
  graphRef,
  nodeDecorationsRef,
}: {
  graphCommitInput: GraphCommitInput;
  graphRef: MutableRefObject<OptimisticIndicatorGraph | undefined>;
  nodeDecorationsRef: MutableRefObject<Record<string, NodeDecorationPayload> | undefined>;
}): void {
  useEffect(() => attachOptimisticFileMutationIndicatorTarget((current, previous) => {
    applyOptimisticFileMutationIndicatorUpdate({
      current,
      graph: graphRef.current,
      graphCommitInput,
      lifecycle: webviewGraphPerfLifecycle,
      nodeDecorationsRef,
      previous,
    });
  }), [graphCommitInput, graphRef, nodeDecorationsRef]);
}
