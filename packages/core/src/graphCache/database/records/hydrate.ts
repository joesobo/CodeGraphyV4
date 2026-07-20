import type { IAnalysisRelation, IAnalysisSymbol, IGraphData, IGraphEdge } from '@codegraphy-dev/plugin-api';
import {
  CACHE_TIER_EDGE_TYPE,
  CACHE_TIER_NODE_TYPE,
  type FileRow,
  type GraphEdgeRow,
  type GraphNodeRow,
} from './contracts';
import { createSnapshotFileEntry, type SnapshotFileEntry } from './file';
import {
  createSnapshotAnalysisNode,
  createSnapshotAnalysisRelation,
  createSnapshotAnalysisSymbol,
  createSnapshotGraphEdge,
  createSnapshotGraphNode,
} from './graph';
import { readOptionalString } from './values';

export interface HydratedDatabaseRecords {
  files: SnapshotFileEntry[];
  graph: IGraphData;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

function mergeGraphEdges(rows: readonly GraphEdgeRow[]): IGraphEdge[] {
  const edges = new Map<string, IGraphEdge>();
  for (const row of rows) {
    if (row.canonicalGraphEdge !== 1 && row.canonicalGraphEdge !== 1n) continue;
    const edge = createSnapshotGraphEdge(row);
    if (!edge) continue;
    const existing = edges.get(edge.id);
    if (!existing) {
      edges.set(edge.id, edge);
      continue;
    }
    const sourceIds = new Set(existing.sources.map(source => source.id));
    for (const source of edge.sources) {
      if (!sourceIds.has(source.id)) {
        existing.sources.push(source);
        sourceIds.add(source.id);
      }
    }
  }
  return [...edges.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function hydrateDatabaseRecords(
  fileRows: readonly FileRow[],
  nodeRows: readonly GraphNodeRow[],
  edgeRows: readonly GraphEdgeRow[],
): HydratedDatabaseRecords {
  const files = fileRows.flatMap(row => {
    const entry = createSnapshotFileEntry(row);
    return entry ? [entry] : [];
  });
  const symbols: IAnalysisSymbol[] = [];
  const relations: IAnalysisRelation[] = [];
  const nodeLabels = new Map(nodeRows.flatMap(row => {
    const id = readOptionalString(row.id);
    const label = readOptionalString(row.label);
    return id && label ? [[id, label] as const] : [];
  }));

  for (const [fileIndex, file] of files.entries()) {
    const fileRow = fileRows[fileIndex];
    const ownedNodeRows = nodeRows.filter(row => readOptionalString(row.filePath) === file.filePath);
    const analysisNodes = [...ownedNodeRows]
      .sort((left, right) => Number(left.analysisNodeOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisNodeOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const node = createSnapshotAnalysisNode(row);
        return node ? [node] : [];
      });
    const analysisSymbols = [...ownedNodeRows]
      .sort((left, right) => Number(left.analysisSymbolOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisSymbolOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const symbol = createSnapshotAnalysisSymbol(row);
        return symbol ? [symbol] : [];
      });
    const analysisRelations = edgeRows
      .filter(row => readOptionalString(row.ownerFilePath) === file.filePath)
      .sort((left, right) => Number(left.analysisOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const relation = createSnapshotAnalysisRelation(row);
        return relation ? [relation] : [];
      });
    if (file.analysis.nodes !== undefined) file.analysis.nodes = analysisNodes;
    if (file.analysis.symbols !== undefined) file.analysis.symbols = analysisSymbols;
    if (file.analysis.relations !== undefined) file.analysis.relations = analysisRelations;
    if (fileRow?.cacheTiersIndexed === 1 || fileRow?.cacheTiersIndexed === 1n) {
      const tiers = edgeRows
        .filter(row => row.type === CACHE_TIER_EDGE_TYPE && row.ownerFilePath === file.filePath)
        .sort((left, right) => Number(left.analysisOrder ?? Number.MAX_SAFE_INTEGER)
          - Number(right.analysisOrder ?? Number.MAX_SAFE_INTEGER))
        .flatMap(row => {
          const targetNodeId = readOptionalString(row.targetNodeId);
          const tier = targetNodeId ? nodeLabels.get(targetNodeId) : undefined;
          return tier ? [tier] : [];
        });
      (file.analysis as typeof file.analysis & { cache: { tiers: string[] } }).cache = { tiers };
    }
    symbols.push(...analysisSymbols);
    relations.push(...analysisRelations);
  }

  const nodes = nodeRows.flatMap(row => {
    if (row.type === CACHE_TIER_NODE_TYPE) return [];
    const node = createSnapshotGraphNode(row);
    return node ? [node] : [];
  });
  return {
    files,
    graph: { nodes, edges: mergeGraphEdges(edgeRows) },
    symbols,
    relations,
  };
}
