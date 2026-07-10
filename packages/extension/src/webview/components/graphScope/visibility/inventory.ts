import type {
  IGraphEdgeTypeDefinition,
} from '../../../../shared/graphControls/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../shared/graphControls/defaults/edgeTypes';
import type { PerfScopeEntry } from '../../../../shared/perf/protocol';
import { graphStore, type GraphState } from '../../../store/state';

const FOLDER_NODE_TYPE = 'folder';

type GraphScopeInventoryState = Pick<
  GraphState,
  | 'edgeVisibility'
  | 'graphEdgeTypes'
  | 'graphHasIndex'
  | 'graphNodeTypes'
  | 'nodeVisibility'
>;

function compareScopeEntries(left: PerfScopeEntry, right: PerfScopeEntry): number {
  return right.scopeKind.localeCompare(left.scopeKind)
    || left.scopeId.localeCompare(right.scopeId);
}

export function resolveAvailableEdgeTypes(
  edgeTypes: IGraphEdgeTypeDefinition[],
  edgeVisibility: Record<string, boolean>,
  graphHasIndex: boolean,
  nodeVisibility: Record<string, boolean>,
): IGraphEdgeTypeDefinition[] {
  const folderNodesEnabled = nodeVisibility[FOLDER_NODE_TYPE] ?? false;
  const structurallyVisibleEdgeTypes = folderNodesEnabled
    ? edgeTypes
    : edgeTypes.filter(edgeType => edgeType.id !== STRUCTURAL_NESTS_EDGE_KIND);
  const visibleEdgeTypes = graphHasIndex
    ? structurallyVisibleEdgeTypes
    : structurallyVisibleEdgeTypes.filter(edgeType => edgeType.id === STRUCTURAL_NESTS_EDGE_KIND);

  return visibleEdgeTypes.filter((edgeType) =>
    !edgeType.requiresEdgeType
    || edgeVisibility[edgeType.requiresEdgeType] === true
    || edgeVisibility[edgeType.id] === true
  );
}

export function buildGraphScopeInventory(
  state: GraphScopeInventoryState,
): PerfScopeEntry[] {
  const nodeEntries: PerfScopeEntry[] = state.graphNodeTypes.map((nodeType) => ({
    scopeKind: 'node',
    scopeId: nodeType.id,
    enabled: state.nodeVisibility[nodeType.id] ?? nodeType.defaultVisible,
  }));
  const edgeEntries: PerfScopeEntry[] = resolveAvailableEdgeTypes(
    state.graphEdgeTypes,
    state.edgeVisibility,
    state.graphHasIndex,
    state.nodeVisibility,
  ).map((edgeType) => ({
    scopeKind: 'edge',
    scopeId: edgeType.id,
    enabled: state.edgeVisibility[edgeType.id] ?? edgeType.defaultVisible,
  }));

  return [...nodeEntries, ...edgeEntries].sort(compareScopeEntries);
}

export function getGraphScopeInventory(): PerfScopeEntry[] {
  return buildGraphScopeInventory(graphStore.getState());
}
