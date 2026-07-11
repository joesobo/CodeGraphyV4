import type { IGraphData } from '../../graph/contracts';
import { getNodeType } from '../model';

export interface GraphEvidenceIndex {
  edgeIdsByKind: Map<string, Set<string>>;
  nodeIdsByKind: Map<string, Set<string>>;
  symbolOwnerById: Map<string, string>;
}

const evidenceIndexes = new WeakMap<IGraphData, GraphEvidenceIndex>();

function addToIndex(
  index: Map<string, Set<string>>,
  kind: string,
  id: string,
): void {
  const ids = index.get(kind) ?? new Set<string>();
  ids.add(id);
  index.set(kind, ids);
}

export function getGraphEvidenceIndex(graphData: IGraphData): GraphEvidenceIndex {
  const cached = evidenceIndexes.get(graphData);
  if (cached) return cached;

  const index: GraphEvidenceIndex = {
    edgeIdsByKind: new Map(),
    nodeIdsByKind: new Map(),
    symbolOwnerById: new Map(),
  };
  for (const node of graphData.nodes) {
    addToIndex(index.nodeIdsByKind, getNodeType(node), node.id);
    if (node.symbol?.filePath) {
      index.symbolOwnerById.set(node.id, node.symbol.filePath);
    }
  }
  for (const edge of graphData.edges) {
    addToIndex(index.edgeIdsByKind, edge.kind, edge.id);
  }

  evidenceIndexes.set(graphData, index);
  return index;
}
