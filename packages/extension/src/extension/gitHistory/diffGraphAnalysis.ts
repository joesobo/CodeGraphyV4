import type { IConnection } from '../../core/plugins';
import type { IGraphData } from '../../shared/types';
import { addGitHistoryGraphFile, modifyGitHistoryGraphFile } from './diffGraphChanges';
import {
  createDiffGraphSnapshot,
  filterDanglingDiffGraphEdges,
} from './diffGraphSnapshot';
import { deleteGitHistoryGraphFile, renameGitHistoryGraphFile } from './diffGraphState';
import { reanalyzeGraphFile } from './reanalyzeGraphFile';

interface DiffGraphRegistry {
  analyzeFile(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IConnection[]>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
  supportsFile(filePath: string): boolean;
}

export interface AnalyzeDiffCommitGraphOptions {
  diffOutput: string;
  getFileAtCommit: (
    sha: string,
    filePath: string,
    signal: AbortSignal,
  ) => Promise<string>;
  previousGraph: IGraphData;
  registry: DiffGraphRegistry;
  sha: string;
  shouldExclude: (filePath: string) => boolean;
  signal: AbortSignal;
  workspaceRoot: string;
}

export async function analyzeDiffCommitGraph(
  options: AnalyzeDiffCommitGraphOptions,
): Promise<IGraphData> {
  const {
    diffOutput,
    getFileAtCommit,
    previousGraph,
    registry,
    sha,
    shouldExclude,
    signal,
    workspaceRoot,
  } = options;

  const { edgeSet, edges, nodeMap, nodes } = createDiffGraphSnapshot(previousGraph);
  const lines = diffOutput.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    if (signal.aborted) {
      const error = new Error('Indexing aborted');
      error.name = 'AbortError';
      throw error;
    }

    const parts = line.split('\t');
    const status = parts[0];

    if (status.startsWith('R')) {
      const oldPath = parts[1];
      const newPath = parts[2];
      renameGitHistoryGraphFile(oldPath, newPath, edges, nodeMap, edgeSet);
      await reanalyzeGraphFile({
        edgeSet,
        edges,
        filePath: newPath,
        getFileAtCommit,
        nodeMap,
        nodes,
        registry,
        sha,
        signal,
        workspaceRoot,
      });
      continue;
    }

    if (status === 'A') {
      if (shouldExclude(parts[1])) {
        continue;
      }

      await addGitHistoryGraphFile({
        edgeSet,
        edges,
        filePath: parts[1],
        getFileAtCommit,
        nodeMap,
        nodes,
        registry,
        sha,
        signal,
        workspaceRoot,
      });
      continue;
    }

    if (status === 'M') {
      await modifyGitHistoryGraphFile({
        edgeSet,
        edges,
        filePath: parts[1],
        getFileAtCommit,
        nodeMap,
        nodes,
        registry,
        sha,
        signal,
        workspaceRoot,
      });
      continue;
    }

    if (status === 'D') {
      deleteGitHistoryGraphFile(parts[1], nodes, edges, nodeMap, edgeSet);
    }
  }

  return {
    nodes,
    edges: filterDanglingDiffGraphEdges(nodes, edges),
  };
}
