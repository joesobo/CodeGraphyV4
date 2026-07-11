import type { IGraphNodeTypeDefinition } from '../../../../shared/graphControls/contracts';
import type { PerfScopeEntry } from '../../../../shared/perf/protocol';
import { flushSync } from 'react-dom';
import { graphStore } from '../../../store/state';
import {
  scheduleEdgeVisibilityMessage,
  scheduleNodeVisibilityMessage,
} from '../messages';
import { getParentNodeTypeUpdates } from './hierarchy';
import { buildGraphScopeInventory } from './inventory';

export function applyNodeScopeVisibility(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  const parentUpdates = visible ? getParentNodeTypeUpdates(nodeTypes, nodeTypeId) : {};
  flushSync(() => {
    graphStore.setState((state) => ({
      graphScopeProjectionRevision: state.graphScopeProjectionRevision + 1,
      nodeVisibility: {
        ...state.nodeVisibility,
        ...parentUpdates,
        [nodeTypeId]: visible,
      },
    }));
  });
  scheduleNodeVisibilityMessage(nodeTypeId, visible, onPosted);
}

export function applyEdgeScopeVisibility(
  edgeKind: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  flushSync(() => {
    graphStore.setState((state) => ({
      edgeVisibility: {
        ...state.edgeVisibility,
        [edgeKind]: visible,
      },
      graphScopeProjectionRevision: state.graphScopeProjectionRevision + 1,
    }));
  });
  scheduleEdgeVisibilityMessage(edgeKind, visible, onPosted);
}

export function applyGraphScopeVisibility(
  entry: PerfScopeEntry,
  onPosted?: () => void,
): boolean {
  const state = graphStore.getState();
  const rowExists = buildGraphScopeInventory(state).some(candidate =>
    candidate.scopeKind === entry.scopeKind && candidate.scopeId === entry.scopeId
  );
  if (!rowExists) return false;

  if (entry.scopeKind === 'node') {
    applyNodeScopeVisibility(state.graphNodeTypes, entry.scopeId, entry.enabled, onPosted);
  } else {
    applyEdgeScopeVisibility(entry.scopeId, entry.enabled, onPosted);
  }
  return true;
}

export function getGraphScopeProjectionRevision(): number {
  return graphStore.getState().graphScopeProjectionRevision;
}
