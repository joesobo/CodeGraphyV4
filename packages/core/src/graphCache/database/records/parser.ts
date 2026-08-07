import type { IAnalysisRelation, IAnalysisSymbol, IGraphData } from '@codegraphy-dev/plugin-api';
import type {
  FileGraphEdgeRow,
  FileRow,
  GraphEdgeRow,
  GraphNodeRow,
  SymbolRow,
} from './types';
import { createSnapshotFileEntry, type SnapshotFileEntry } from './file';
import {
  createSnapshotAnalysisNode,
  createSnapshotAnalysisRelation,
  createSnapshotAnalysisSymbol,
  createSnapshotGraphEdge,
  createSnapshotGraphNode,
} from './graph/parser';
import { readOptionalString } from './values';

export interface HydratedDatabaseRecords {
  files: SnapshotFileEntry[];
  graph: IGraphData;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

function appendGroupedRow<Row>(groups: Map<string, Row[]>, key: string | undefined, row: Row): void {
  if (!key) return;
  const rows = groups.get(key) ?? [];
  rows.push(row);
  groups.set(key, rows);
}

function hydrateGraphRows(
  nodeRows: readonly GraphNodeRow[],
  symbolRows: readonly SymbolRow[],
  edgeRows: readonly GraphEdgeRow[],
) {
  const hydratedNodeRows = nodeRows.map(row => ({
    ...row,
    filePath: readOptionalString(row.filePath) ?? readOptionalString(row.fileId),
    parentKey: readOptionalString(row.parentKey) ?? readOptionalString(row.parentId),
  }));
  const nodeRowsByKey = new Map(hydratedNodeRows.flatMap(row => {
    const key = readOptionalString(row.key);
    return key ? [[key, row] as const] : [];
  }));
  const symbolRowsByFilePath = new Map<string, SymbolRow[]>();
  const symbolRowsByNodeKey = new Map<string, SymbolRow>();
  for (const row of symbolRows) {
    const nodeKey = readOptionalString(row.nodeKey) ?? readOptionalString(row.nodeId);
    const hydratedRow = {
      ...row,
      nodeKey,
      ownerFilePath: readOptionalString(row.ownerFilePath)
        ?? (nodeKey ? readOptionalString(nodeRowsByKey.get(nodeKey)?.filePath) : undefined),
    };
    appendGroupedRow(symbolRowsByFilePath, readOptionalString(hydratedRow.ownerFilePath), hydratedRow);
    if (nodeKey) symbolRowsByNodeKey.set(nodeKey, hydratedRow);
  }
  const hydratedEdgeRows = edgeRows.map(row => {
    const sourceNodeKey = readOptionalString(row.sourceNodeKey) ?? readOptionalString(row.sourceNodeId);
    const targetNodeKey = readOptionalString(row.targetNodeKey) ?? readOptionalString(row.targetNodeId);
    const sourceNode = sourceNodeKey ? nodeRowsByKey.get(sourceNodeKey) : undefined;
    const targetNode = targetNodeKey ? nodeRowsByKey.get(targetNodeKey) : undefined;
    return {
      ...row,
      sourceNodeKey,
      sourceNodeType: readOptionalString(row.sourceNodeType) ?? readOptionalString(sourceNode?.type),
      sourceFilePath: readOptionalString(row.sourceFilePath) ?? readOptionalString(sourceNode?.filePath),
      targetNodeKey,
      targetNodeType: readOptionalString(row.targetNodeType) ?? readOptionalString(targetNode?.type),
      targetFilePath: readOptionalString(row.targetFilePath) ?? readOptionalString(targetNode?.filePath),
    };
  });
  return { hydratedEdgeRows, hydratedNodeRows, symbolRowsByFilePath, symbolRowsByNodeKey };
}

function createGraphFromHydratedRows(
  hydratedNodeRows: readonly GraphNodeRow[],
  hydratedEdgeRows: readonly GraphEdgeRow[],
  symbolRowsByNodeKey: ReadonlyMap<string, SymbolRow>,
): IGraphData {
  const nodes = hydratedNodeRows.flatMap(row => {
    const key = readOptionalString(row.key);
    const node = createSnapshotGraphNode(row, key ? symbolRowsByNodeKey.get(key) : undefined);
    return node ? [node] : [];
  });
  const edges = hydratedEdgeRows.flatMap(row => {
    const edge = createSnapshotGraphEdge(row);
    return edge ? [edge] : [];
  });
  return { nodes, edges };
}

export function parseDatabaseGraphRecords(
  nodeRows: readonly GraphNodeRow[],
  symbolRows: readonly SymbolRow[],
  edgeRows: readonly GraphEdgeRow[],
): IGraphData {
  const hydrated = hydrateGraphRows(nodeRows, symbolRows, edgeRows);
  return createGraphFromHydratedRows(
    hydrated.hydratedNodeRows,
    hydrated.hydratedEdgeRows,
    hydrated.symbolRowsByNodeKey,
  );
}

export function parseDatabaseFileGraphRecords(
  nodeRows: readonly GraphNodeRow[],
  edgeRows: readonly FileGraphEdgeRow[],
): IGraphData {
  const nodes = nodeRows.flatMap(row => {
    const node = createSnapshotGraphNode(row);
    return node ? [node] : [];
  });
  const edges = edgeRows.flatMap(row => {
    const edge = createSnapshotGraphEdge(row);
    if (!edge) return [];
    const sourceWasFile = readOptionalString(row.originalSourceNodeKey) === edge.from;
    const targetWasFile = readOptionalString(row.originalTargetNodeKey) === edge.to;
    if (sourceWasFile && targetWasFile) return [edge];
    if (edge.from === edge.to) return [];
    const suffixStart = edge.id.lastIndexOf('#');
    const suffix = suffixStart >= 0 ? edge.id.slice(suffixStart) : `#${edge.kind}`;
    return [{
      ...edge,
      id: `${edge.from}->${edge.to}${suffix}`,
    }];
  });
  return { nodes, edges };
}

export function parseDatabaseRecords(
  fileRows: readonly FileRow[],
  nodeRows: readonly GraphNodeRow[],
  symbolRows: readonly SymbolRow[],
  edgeRows: readonly GraphEdgeRow[],
  workspaceRoot: string,
): HydratedDatabaseRecords {
  const files = fileRows.flatMap(row => {
    const entry = createSnapshotFileEntry(row, workspaceRoot);
    return entry ? [entry] : [];
  });
  const {
    hydratedEdgeRows,
    hydratedNodeRows,
    symbolRowsByFilePath,
    symbolRowsByNodeKey,
  } = hydrateGraphRows(nodeRows, symbolRows, edgeRows);
  const nodeRowsByFilePath = new Map<string, GraphNodeRow[]>();
  for (const row of hydratedNodeRows) {
    appendGroupedRow(nodeRowsByFilePath, readOptionalString(row.filePath), row);
  }
  const edgeRowsBySourceFilePath = new Map<string, GraphEdgeRow[]>();
  for (const row of hydratedEdgeRows) {
    appendGroupedRow(edgeRowsBySourceFilePath, readOptionalString(row.sourceFilePath), row);
  }

  const symbols: IAnalysisSymbol[] = [];
  const relations: IAnalysisRelation[] = [];
  for (const file of files) {
    const analysisNodes = (nodeRowsByFilePath.get(file.filePath) ?? []).flatMap(row => {
      const key = readOptionalString(row.key);
      if (!key || key === file.filePath || symbolRowsByNodeKey.has(key)) return [];
      const node = createSnapshotAnalysisNode(row, workspaceRoot);
      return node ? [node] : [];
    });
    const analysisSymbols = (symbolRowsByFilePath.get(file.filePath) ?? []).flatMap(row => {
      const symbol = createSnapshotAnalysisSymbol(row, workspaceRoot);
      return symbol ? [symbol] : [];
    });
    const analysisRelations = (edgeRowsBySourceFilePath.get(file.filePath) ?? []).flatMap(row => {
      const relation = createSnapshotAnalysisRelation(row, workspaceRoot);
      return relation ? [relation] : [];
    });
    file.analysis.nodes = analysisNodes;
    file.analysis.symbols = analysisSymbols;
    file.analysis.relations = analysisRelations;
    symbols.push(...analysisSymbols);
    relations.push(...analysisRelations);
  }

  const graph = createGraphFromHydratedRows(
    hydratedNodeRows,
    hydratedEdgeRows,
    symbolRowsByNodeKey,
  );
  return { files, graph, symbols, relations };
}
