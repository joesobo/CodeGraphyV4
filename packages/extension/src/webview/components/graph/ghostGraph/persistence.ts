import type { IGraphData } from '../../../../shared/graph/contracts';
import type { FGNode } from '../model/build';

const GHOST_GRAPH_STATE_KEY = 'codegraphyGhostGraph';
const GHOST_GRAPH_STATE_VERSION = 1;

export interface GhostGraphStateStorage {
  getState(): unknown;
  setState(state: unknown): void;
}

interface PersistedGhostGraphState {
  version: typeof GHOST_GRAPH_STATE_VERSION;
  graph: IGraphData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGraphData(value: unknown): value is IGraphData {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return false;
  }
  return value.nodes.every(node => isRecord(node)
    && typeof node.id === 'string'
    && typeof node.label === 'string'
    && typeof node.color === 'string')
    && value.edges.every(edge => isRecord(edge)
      && typeof edge.id === 'string'
      && typeof edge.from === 'string'
      && typeof edge.to === 'string');
}

export function readPersistedGhostGraph(
  storage: GhostGraphStateStorage | null,
): IGraphData | null {
  const state = storage?.getState();
  if (!isRecord(state)) return null;
  const persisted = state[GHOST_GRAPH_STATE_KEY];
  if (
    !isRecord(persisted)
    || persisted.version !== GHOST_GRAPH_STATE_VERSION
    || !isGraphData(persisted.graph)
  ) {
    return null;
  }
  return persisted.graph;
}

export function persistGhostGraph(
  graph: IGraphData,
  runtimeNodes: readonly Pick<FGNode, 'id' | 'x' | 'y'>[],
  storage: GhostGraphStateStorage | null,
): void {
  if (!storage || graph.nodes.length === 0) return;
  const positions = new Map(runtimeNodes.map(node => [node.id, node]));
  const positionedGraph: IGraphData = {
    ...graph,
    nodes: graph.nodes.map(node => {
      const runtimeNode = positions.get(node.id);
      return {
        ...node,
        ...(Number.isFinite(runtimeNode?.x) ? { x: runtimeNode?.x } : {}),
        ...(Number.isFinite(runtimeNode?.y) ? { y: runtimeNode?.y } : {}),
      };
    }),
    edges: [...graph.edges],
  };
  const currentState = storage.getState();
  const nextState = isRecord(currentState) ? { ...currentState } : {};
  nextState[GHOST_GRAPH_STATE_KEY] = {
    version: GHOST_GRAPH_STATE_VERSION,
    graph: positionedGraph,
  } satisfies PersistedGhostGraphState;
  storage.setState(nextState);
}
