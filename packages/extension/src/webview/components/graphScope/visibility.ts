import type {
  IGraphControlsSnapshot,
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../shared/graphControls/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../shared/graphControls/defaults/edgeTypes';
import type { PerfScopeEntry } from '../../../shared/perf/protocol';
import { graphStore, type GraphState } from '../../store/state';
import {
  scheduleEdgeVisibilityMessage,
  scheduleNodeVisibilityMessage,
} from './messages';

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
  if (left.scopeKind !== right.scopeKind) {
    return left.scopeKind === 'node' ? -1 : 1;
  }
  if (left.scopeId === right.scopeId) {
    return 0;
  }
  return left.scopeId < right.scopeId ? -1 : 1;
}

function getParentNodeTypeUpdates(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
): Record<string, boolean> {
  const nodeTypeById = new Map(nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const updates: Record<string, boolean> = {};
  let current = nodeTypeById.get(nodeTypeId);

  while (current?.parentId) {
    updates[current.parentId] = true;
    current = nodeTypeById.get(current.parentId);
  }

  return updates;
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

export function getGraphControlsScopeEnabled(
  snapshot: IGraphControlsSnapshot,
  entry: Pick<PerfScopeEntry, 'scopeKind' | 'scopeId'>,
): boolean | undefined {
  const definitions = entry.scopeKind === 'node' ? snapshot.nodeTypes : snapshot.edgeTypes;
  const definition = definitions.find(candidate => candidate.id === entry.scopeId);
  if (!definition) {
    return undefined;
  }
  const visibility = entry.scopeKind === 'node'
    ? snapshot.nodeVisibility
    : snapshot.edgeVisibility;
  return visibility[entry.scopeId] ?? definition.defaultVisible;
}

export function applyNodeScopeVisibility(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  const parentUpdates = visible ? getParentNodeTypeUpdates(nodeTypes, nodeTypeId) : {};
  graphStore.setState((state) => ({
    nodeVisibility: {
      ...state.nodeVisibility,
      ...parentUpdates,
      [nodeTypeId]: visible,
    },
  }));
  scheduleNodeVisibilityMessage(nodeTypeId, visible, onPosted);
}

export function applyEdgeScopeVisibility(
  edgeKind: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  graphStore.setState((state) => ({
    edgeVisibility: {
      ...state.edgeVisibility,
      [edgeKind]: visible,
    },
  }));
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
  if (!rowExists) {
    return false;
  }

  if (entry.scopeKind === 'node') {
    applyNodeScopeVisibility(state.graphNodeTypes, entry.scopeId, entry.enabled, onPosted);
  } else {
    applyEdgeScopeVisibility(entry.scopeId, entry.enabled, onPosted);
  }
  return true;
}
