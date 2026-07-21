import type { IAnalysisRelation, IAnalysisSymbol, IGraphData, IGraphEdge } from '@codegraphy-dev/plugin-api';
import {
  type FileRow,
  type GraphEdgeRow,
  type GraphNodeRow,
  type SymbolRow,
} from './types';
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

function nodeFilePath(row: GraphNodeRow): string | undefined {
  return readOptionalString(row.filePath) ?? readOptionalString(row.fileId);
}

function symbolNodeKey(row: SymbolRow): string | undefined {
  return readOptionalString(row.nodeKey) ?? readOptionalString(row.nodeId);
}

export function parseDatabaseRecords(
  fileRows: readonly FileRow[],
  nodeRows: readonly GraphNodeRow[],
  symbolRows: readonly SymbolRow[],
  edgeRows: readonly GraphEdgeRow[],
): HydratedDatabaseRecords {
  const files = fileRows.flatMap(row => {
    const entry = createSnapshotFileEntry(row);
    return entry ? [entry] : [];
  });
  const symbols: IAnalysisSymbol[] = [];
  const relations: IAnalysisRelation[] = [];
  for (const file of files) {
    const ownedNodeRows = nodeRows.filter(row => nodeFilePath(row) === file.filePath);
    const analysisNodes = [...ownedNodeRows]
      .sort((left, right) => Number(left.analysisNodeOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisNodeOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const node = createSnapshotAnalysisNode(row);
        return node ? [node] : [];
      });
    const ownedNodeKeys = new Set(ownedNodeRows.flatMap(row => {
      const key = readOptionalString(row.key);
      return key ? [key] : [];
    }));
    const analysisSymbols = symbolRows
      .filter(row => readOptionalString(row.filePath) === file.filePath
        || ownedNodeKeys.has(symbolNodeKey(row) ?? ''))
      .sort((left, right) => Number(left.analysisOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const symbol = createSnapshotAnalysisSymbol(row);
        return symbol ? [symbol] : [];
      });
    const analysisRelations = edgeRows
      .filter(row => (readOptionalString(row.ownerFilePath) ?? readOptionalString(row.ownerFileId)) === file.filePath)
      .sort((left, right) => Number(left.analysisOrder ?? Number.MAX_SAFE_INTEGER)
        - Number(right.analysisOrder ?? Number.MAX_SAFE_INTEGER))
      .flatMap(row => {
        const relation = createSnapshotAnalysisRelation(row);
        return relation ? [relation] : [];
      });
    file.analysis.nodes = analysisNodes;
    file.analysis.symbols = analysisSymbols;
    file.analysis.relations = analysisRelations;
    symbols.push(...analysisSymbols);
    relations.push(...analysisRelations);
  }

  const symbolRowsByNodeKey = new Map(symbolRows.flatMap(row => {
    const key = symbolNodeKey(row);
    return key ? [[key, row] as const] : [];
  }));
  const nodes = nodeRows.flatMap(row => {
    const key = readOptionalString(row.key);
    const node = createSnapshotGraphNode(row, key ? symbolRowsByNodeKey.get(key) : undefined);
    return node ? [node] : [];
  });
  return {
    files,
    graph: { nodes, edges: mergeGraphEdges(edgeRows) },
    symbols,
    relations,
  };
}
