import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IGraphData,
} from '@codegraphy-dev/plugin-api';
import { readRowsSync, withConnection } from './io/connection';
import { getWorkspaceAnalysisDatabasePath } from './io/paths';
import { createSnapshotFileEntry } from './records/file';
import { createSnapshotGraphEdge, createSnapshotGraphNode } from './records/graph';
import type { GraphEdgeRow, GraphNodeRow, IndexedFileRow } from './records/contracts';
import { EDGE_ROWS_QUERY, INDEXED_FILE_ROWS_QUERY, NODE_ROWS_QUERY } from './query/read';

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
    contentHash?: string;
    size?: number;
    analysis: IFileAnalysisResult;
  }>;
  graph: IGraphData;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

export interface WorkspaceAnalysisDatabaseRecordCounts {
  indexedFiles: number;
  nodes: number;
  edges: number;
}

const EMPTY_COUNTS: WorkspaceAnalysisDatabaseRecordCounts = {
  indexedFiles: 0,
  nodes: 0,
  edges: 0,
};

const EMPTY_SNAPSHOT: WorkspaceAnalysisDatabaseSnapshot = {
  files: [],
  graph: { nodes: [], edges: [] },
  symbols: [],
  relations: [],
};

export function readWorkspaceAnalysisDatabaseRecordCounts(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseRecordCounts {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_COUNTS;
  try {
    return withConnection(databasePath, connection => {
      const rows = readRowsSync(connection, `SELECT
        (SELECT count(*) FROM IndexedFile) AS indexedFiles,
        (SELECT count(*) FROM Node) AS nodes,
        (SELECT count(*) FROM Edge) AS edges`);
      const row = rows[0] as Partial<WorkspaceAnalysisDatabaseRecordCounts> | undefined;
      return {
        indexedFiles: Number(row?.indexedFiles ?? 0),
        nodes: Number(row?.nodes ?? 0),
        edges: Number(row?.edges ?? 0),
      };
    });
  } catch {
    return EMPTY_COUNTS;
  }
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_SNAPSHOT;

  try {
    return withConnection(databasePath, connection => {
      const files = (readRowsSync(connection, INDEXED_FILE_ROWS_QUERY) as IndexedFileRow[])
        .flatMap(row => {
          const entry = createSnapshotFileEntry(row);
          return entry ? [entry] : [];
        });
      const nodes = (readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[])
        .flatMap(row => {
          const node = createSnapshotGraphNode(row);
          return node ? [node] : [];
        });
      const edges = (readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[])
        .flatMap(row => {
          const edge = createSnapshotGraphEdge(row);
          return edge ? [edge] : [];
        });

      return {
        files,
        graph: { nodes, edges },
        symbols: files.flatMap(file => file.analysis.symbols ?? []),
        relations: files.flatMap(file => file.analysis.relations ?? []),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return EMPTY_SNAPSHOT;
  }
}
