import type { IAnalysisRelation, IAnalysisSymbol, IGraphData } from '@codegraphy-dev/plugin-api';
import type { FileRow, GraphEdgeRow, GraphNodeRow, SymbolRow } from './types';
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

function appendGroupedRow<Row>(groups: Map<string, Row[]>, key: string | undefined, row: Row): void {
  if (!key) return;
  const rows = groups.get(key) ?? [];
  rows.push(row);
  groups.set(key, rows);
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
  const hydratedNodeRows = nodeRows.map(row => ({
    ...row,
    filePath: readOptionalString(row.filePath) ?? readOptionalString(row.fileId),
    parentKey: readOptionalString(row.parentKey) ?? readOptionalString(row.parentId),
  }));
  const nodeRowsByKey = new Map(hydratedNodeRows.flatMap(row => {
    const key = readOptionalString(row.key);
    return key ? [[key, row] as const] : [];
  }));
  const nodeRowsByFilePath = new Map<string, GraphNodeRow[]>();
  for (const row of hydratedNodeRows) {
    appendGroupedRow(nodeRowsByFilePath, readOptionalString(row.filePath), row);
  }
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

  const nodes = hydratedNodeRows.flatMap(row => {
    const key = readOptionalString(row.key);
    const node = createSnapshotGraphNode(row, key ? symbolRowsByNodeKey.get(key) : undefined);
    return node ? [node] : [];
  });
  const edges = hydratedEdgeRows.flatMap(row => {
    const edge = createSnapshotGraphEdge(row);
    return edge ? [edge] : [];
  });
  return { files, graph: { nodes, edges }, symbols, relations };
}
