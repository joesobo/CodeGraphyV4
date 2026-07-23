import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IGraphData, IPluginNodeType } from '@codegraphy-dev/plugin-api';
import {
  recreateInvalidDatabase,
  runStatementSync,
  withConnection,
} from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createWorkspaceAnalysisCachePatchWriter,
  createWorkspaceAnalysisCacheWriter,
  deleteAnalysisEntry,
  deleteAnalysisEntryNodes,
  persistWorkspaceCache,
  persistWorkspaceCachePatch,
} from '../query/write';

export { saveWorkspaceAnalysisDatabaseCacheAsync } from './saveAsync';

export interface WorkspaceAnalysisDatabaseSaveProgress {
  current: number;
  total: number;
}

export interface WorkspaceAnalysisDatabaseSaveOptions {
  graph?: IGraphData;
  nodeTypes?: readonly IPluginNodeType[];
  onProgress?: (progress: WorkspaceAnalysisDatabaseSaveProgress) => void;
  yieldEvery?: number;
}

export interface WorkspaceAnalysisDatabasePatch {
  deleteFilePaths?: readonly string[];
  upsertFiles?: IWorkspaceAnalysisCache['files'];
  graph?: IGraphData;
  nodeTypes?: readonly IPluginNodeType[];
}

function normalizedPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function pathBelongsToPatch(value: unknown, filePaths: ReadonlySet<string>): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizedPath(value);
  if (filePaths.has(normalized)) return true;
  for (const filePath of filePaths) {
    if (normalized.endsWith(`/${filePath}`)) return true;
  }
  return false;
}

function selectGraphPatch(
  graph: IGraphData | undefined,
  filePaths: ReadonlySet<string>,
): IGraphData | undefined {
  if (!graph) return undefined;
  const affectedNodeIds = new Set(graph.nodes.flatMap(node => (
    pathBelongsToPatch(node.id, filePaths)
    || pathBelongsToPatch(node.symbol?.filePath, filePaths)
    || pathBelongsToPatch(node.metadata?.filePath, filePaths)
      ? [node.id]
      : []
  )));
  const edges = graph.edges.filter(edge => (
    affectedNodeIds.has(edge.from) || affectedNodeIds.has(edge.to)
  ));
  const includedNodeIds = new Set(affectedNodeIds);
  for (const edge of edges) {
    includedNodeIds.add(edge.from);
    includedNodeIds.add(edge.to);
  }
  return {
    nodes: graph.nodes.filter(node => includedNodeIds.has(node.id)),
    edges,
  };
}

function runTransactionSync(connection: Parameters<typeof runStatementSync>[0], patch: () => void): void {
  runStatementSync(connection, 'BEGIN TRANSACTION');
  let committed = false;

  try {
    patch();
    runStatementSync(connection, 'COMMIT');
    committed = true;
  } catch (error) {
    if (!committed) {
      try {
        runStatementSync(connection, 'ROLLBACK');
      } catch {
        // Keep the original patch failure as the actionable error.
      }
    }
    throw error;
  }
}

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
  nodeTypes?: readonly IPluginNodeType[],
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }
  const persist = (): void => {
    withConnection(databasePath, (connection) => {
      runTransactionSync(connection, () => {
        runStatementSync(connection, 'DELETE FROM Edge');
        runStatementSync(connection, 'DELETE FROM Symbol');
        runStatementSync(connection, 'DELETE FROM Node');
        runStatementSync(connection, 'DELETE FROM File');

        const writer = createWorkspaceAnalysisCacheWriter(connection);
        if (nodeTypes) {
          persistWorkspaceCache(writer, cache, graph, nodeTypes);
        } else {
          persistWorkspaceCache(writer, cache, graph);
        }
      });
    });
  };

  try {
    persist();
  } catch (error) {
    if (!recreateInvalidDatabase(databasePath, error)) {
      throw error;
    }
    persist();
  }
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }
  const upsertFiles = patch.upsertFiles ?? {};
  const upsertFilePaths = Object.keys(upsertFiles);
  const deleteFilePaths = [...new Set(patch.deleteFilePaths ?? [])]
    .filter(filePath => !(filePath in upsertFiles))
    .sort();
  const affectedFilePaths = new Set([...deleteFilePaths, ...upsertFilePaths]);
  const graph = selectGraphPatch(patch.graph, affectedFilePaths);

  withConnection(databasePath, connection => {
    runTransactionSync(connection, () => {
      const writer = createWorkspaceAnalysisCachePatchWriter(connection);
      for (const filePath of upsertFilePaths.sort()) {
        deleteAnalysisEntryNodes(writer, filePath);
      }
      for (const filePath of deleteFilePaths) {
        deleteAnalysisEntry(writer, filePath);
      }
      const patchCache = { version: '', files: upsertFiles };
      if (patch.nodeTypes) {
        persistWorkspaceCachePatch(writer, patchCache, graph, patch.nodeTypes);
      } else {
        persistWorkspaceCachePatch(writer, patchCache, graph);
      }
    });
  });
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'DELETE FROM Edge');
    runStatementSync(connection, 'DELETE FROM Symbol');
    runStatementSync(connection, 'DELETE FROM Node');
    runStatementSync(connection, 'DELETE FROM File');
  });
}
