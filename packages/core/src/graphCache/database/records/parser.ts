import type { IAnalysisRelation, IAnalysisSymbol, IGraphData, IGraphEdge } from '@codegraphy-dev/plugin-api';
import {
  type FileRow,
  type GraphEdgeRow,
  type GraphNodeRow,
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

export function parseDatabaseRecords(
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
  const fileRowsByPath = new Map(fileRows.flatMap(row => {
    const filePath = readOptionalString(row.path);
    return filePath ? [[filePath, row] as const] : [];
  }));
  for (const file of files) {
    const fileRow = fileRowsByPath.get(file.filePath);
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
    if (fileRow?.baselineIndexed === 1 || fileRow?.baselineIndexed === 1n) {
      (file.analysis as typeof file.analysis & { cache: { tiers: string[] } }).cache = {
        tiers: [
          'baseline',
          ...(file.analysis.symbols !== undefined ? ['symbols'] : []),
        ],
      };
    }
    symbols.push(...analysisSymbols);
    relations.push(...analysisRelations);
  }

  const nodes = nodeRows.flatMap(row => {
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
