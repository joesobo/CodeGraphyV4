import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IGraphData,
} from '@codegraphy-dev/plugin-api';
import {
  readRowsSync,
  withReadOnlyConnection,
} from './io/connection';
import { getWorkspaceAnalysisDatabasePath } from './io/paths';
import {
  parseDatabaseFileGraphRecords,
  parseDatabaseGraphRecords,
  parseDatabaseRecords,
} from './records/parser';
import type {
  FileGraphEdgeRow,
  FileRow,
  GraphEdgeRow,
  GraphNodeRow,
  SymbolRow,
} from './records/types';
import {
  EDGE_ROWS_QUERY,
  FILE_GRAPH_EDGE_ROWS_QUERY,
  FILE_NODE_ROWS_QUERY,
  FILE_ROWS_QUERY,
  NODE_ROWS_QUERY,
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
  graph: IGraphData;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

const EMPTY_SNAPSHOT: WorkspaceAnalysisDatabaseSnapshot = {
  files: [],
  graph: { nodes: [], edges: [] },
  symbols: [],
  relations: [],
};
const EMPTY_GRAPH: IGraphData = { nodes: [], edges: [] };

export function readWorkspaceAnalysisDatabaseGraph(workspaceRoot: string): IGraphData {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_GRAPH;

  try {
    return withReadOnlyConnection(databasePath, connection => parseDatabaseGraphRecords(
      readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[],
      readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[],
      readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[],
    ));
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured Relationship Graph.', error);
    return EMPTY_GRAPH;
  }
}

export function readWorkspaceAnalysisDatabaseFileGraph(workspaceRoot: string): IGraphData {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_GRAPH;

  try {
    return withReadOnlyConnection(databasePath, connection => parseDatabaseFileGraphRecords(
      readRowsSync(connection, FILE_NODE_ROWS_QUERY) as GraphNodeRow[],
      readRowsSync(connection, FILE_GRAPH_EDGE_ROWS_QUERY) as FileGraphEdgeRow[],
    ));
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read the File Relationship Graph.', error);
    return EMPTY_GRAPH;
  }
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_SNAPSHOT;

  try {
    return withReadOnlyConnection(databasePath, connection => {
      return parseDatabaseRecords(
        readRowsSync(connection, FILE_ROWS_QUERY) as FileRow[],
        readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[],
        readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[],
        readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[],
        workspaceRoot,
      );
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return EMPTY_SNAPSHOT;
  }
}
