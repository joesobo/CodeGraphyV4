import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { readRowsSync, withConnection } from './io/connection';
import { getWorkspaceAnalysisDatabasePath } from './io/paths';
import { createSnapshotEdgeTypeEntry, createSnapshotFileEntry, createSnapshotNodeEntry, createSnapshotNodeTypeEntry } from './records/file';
import { createSnapshotRelationEntry } from './relation/entry';
import { createSnapshotSymbolEntry } from './records/symbol';
import type { GraphTypeRow, NodeRow, RelationRow, SymbolRow } from './records/contracts';
import {
  FILE_ROWS_QUERY,
  EDGE_TYPE_ROWS_QUERY,
  NODE_ROWS_QUERY,
  NODE_TYPE_ROWS_QUERY,
  RELATION_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from './query/read';

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
    contentHash?: string;
    size?: number;
    analysis: IFileAnalysisResult;
  }>;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

export interface WorkspaceAnalysisDatabaseRecordCounts {
  files: number;
  nodes: number;
  symbols: number;
  relations: number;
  nodeTypes: number;
  edgeTypes: number;
}

export function readWorkspaceAnalysisDatabaseRecordCounts(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseRecordCounts {
  const empty = { files: 0, nodes: 0, symbols: 0, relations: 0, nodeTypes: 0, edgeTypes: 0 };
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return empty;
  try {
    return withConnection(databasePath, connection => {
      const rows = readRowsSync(connection, `SELECT
        (SELECT count(*) FROM File) AS files,
        (SELECT count(*) FROM Node) AS nodes,
        (SELECT count(*) FROM Symbol) AS symbols,
        (SELECT count(*) FROM Relation) AS relations,
        (SELECT count(*) FROM NodeType) AS nodeTypes,
        (SELECT count(*) FROM EdgeType) AS edgeTypes`);
      const row = rows[0] as Record<keyof WorkspaceAnalysisDatabaseRecordCounts, number> | undefined;
      return row ?? empty;
    });
  } catch {
    return empty;
  }
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return { files: [], symbols: [], relations: [] };
  }

  try {
    return withConnection(databasePath, (connection) => {
      const fileRows = readRowsSync(connection, FILE_ROWS_QUERY);
      const symbolRows = readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
      const relationRows = readRowsSync(connection, RELATION_ROWS_QUERY) as RelationRow[];
      const nodeRows = readRowsSync(connection, NODE_ROWS_QUERY) as NodeRow[];
      const nodeTypeRows = readRowsSync(connection, NODE_TYPE_ROWS_QUERY) as GraphTypeRow[];
      const edgeTypeRows = readRowsSync(connection, EDGE_TYPE_ROWS_QUERY) as GraphTypeRow[];
      const files = fileRows.flatMap((row) => {
        const entry = createSnapshotFileEntry(row);
        return entry ? [entry] : [];
      });
      const analysisPathByFilePath = new Map(files.map(file => [
        file.filePath,
        file.analysis.filePath ?? file.filePath,
      ]));
      const symbolRecords = symbolRows.flatMap((row) => {
        const entry = createSnapshotSymbolEntry(row);
        const ownerFilePath = typeof row.filePath === 'string' ? row.filePath : entry?.filePath;
        const filePath = ownerFilePath ? analysisPathByFilePath.get(ownerFilePath) : undefined;
        return entry && ownerFilePath
          ? [{ ownerFilePath, value: { ...entry, filePath: filePath ?? entry.filePath } }]
          : [];
      });
      const relationRecords = relationRows.flatMap((row) => {
        const entry = createSnapshotRelationEntry(row);
        const ownerFilePath = typeof row.filePath === 'string' ? row.filePath : entry?.fromFilePath;
        return entry && ownerFilePath
          ? [{ ownerFilePath, value: entry }]
          : [];
      });
      const symbolsByFilePath = new Map<string, IAnalysisSymbol[]>();
      for (const record of symbolRecords) {
        const entries = symbolsByFilePath.get(record.ownerFilePath) ?? [];
        entries.push(record.value);
        symbolsByFilePath.set(record.ownerFilePath, entries);
      }
      const relationsByFilePath = new Map<string, IAnalysisRelation[]>();
      for (const record of relationRecords) {
        const entries = relationsByFilePath.get(record.ownerFilePath) ?? [];
        entries.push(record.value);
        relationsByFilePath.set(record.ownerFilePath, entries);
      }
      const normalizedFactsByFilePath = new Map(files.map(file => [file.filePath, {
        nodes: nodeRows.filter(row => row.filePath === file.filePath).flatMap(row => {
          const value = createSnapshotNodeEntry(row); return value ? [value] : [];
        }),
        nodeTypes: nodeTypeRows.filter(row => row.filePath === file.filePath).flatMap(row => {
          const value = createSnapshotNodeTypeEntry(row); return value ? [value] : [];
        }),
        edgeTypes: edgeTypeRows.filter(row => row.filePath === file.filePath).flatMap(row => {
          const value = createSnapshotEdgeTypeEntry(row); return value ? [value] : [];
        }),
      }]));
      const hydratedFiles = files.map(file => ({
        ...file,
        analysis: {
          ...file.analysis,
          ...((symbolsByFilePath.get(file.filePath)?.length ?? 0) > 0
            ? { symbols: symbolsByFilePath.get(file.filePath) }
            : {}),
          ...((relationsByFilePath.get(file.filePath)?.length ?? 0) > 0
            ? { relations: relationsByFilePath.get(file.filePath) }
            : {}),
          ...((normalizedFactsByFilePath.get(file.filePath)?.nodes.length ?? 0) > 0
            ? { nodes: normalizedFactsByFilePath.get(file.filePath)?.nodes }
            : {}),
          ...((normalizedFactsByFilePath.get(file.filePath)?.nodeTypes.length ?? 0) > 0
            ? { nodeTypes: normalizedFactsByFilePath.get(file.filePath)?.nodeTypes }
            : {}),
          ...((normalizedFactsByFilePath.get(file.filePath)?.edgeTypes.length ?? 0) > 0
            ? { edgeTypes: normalizedFactsByFilePath.get(file.filePath)?.edgeTypes }
            : {}),
        },
      }));

      return {
        files: hydratedFiles,
        symbols: symbolRecords.map(record => record.value),
        relations: relationRecords.map(record => record.value),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return { files: [], symbols: [], relations: [] };
  }
}
