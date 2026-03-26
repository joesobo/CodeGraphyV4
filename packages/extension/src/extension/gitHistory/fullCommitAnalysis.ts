import * as path from 'path';
import type { IConnection } from '../../core/plugins/types';
import { getFileColor, type IGraphData, type IGraphEdge, type IGraphNode } from '../../shared/contracts';
import { appendGitHistoryConnectionEdges } from './graphConnections';

interface FullCommitAnalysisRegistry {
  analyzeFile(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IConnection[]>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
}

export interface AnalyzeFullCommitGraphOptions {
  allFiles: readonly string[];
  getFileAtCommit: (
    sha: string,
    filePath: string,
    signal: AbortSignal,
  ) => Promise<string>;
  registry: FullCommitAnalysisRegistry;
  sha: string;
  shouldExclude: (filePath: string) => boolean;
  signal: AbortSignal;
  supportedExtensions: ReadonlySet<string>;
  workspaceRoot: string;
}

export function createGitHistoryNode(filePath: string): IGraphNode {
  return {
    id: filePath,
    label: path.basename(filePath),
    color: getFileColor(path.extname(filePath)),
  };
}

export async function analyzeFullCommitGraph(
  options: AnalyzeFullCommitGraphOptions,
): Promise<IGraphData> {
  const {
    allFiles,
    getFileAtCommit,
    registry,
    sha,
    shouldExclude,
    signal,
    supportedExtensions,
    workspaceRoot,
  } = options;

  const files = allFiles.filter((filePath) => {
    if (shouldExclude(filePath)) {
      return false;
    }

    return supportedExtensions.has(path.extname(filePath).toLowerCase());
  });

  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeSet = new Set<string>();

  for (const filePath of files) {
    if (signal.aborted) {
      const error = new Error('Indexing aborted');
      error.name = 'AbortError';
      throw error;
    }

    const content = await getFileAtCommit(sha, filePath, signal);
    const absolutePath = path.join(workspaceRoot, filePath);
    const connections = await registry.analyzeFile(absolutePath, content, workspaceRoot);
    const plugin = registry.getPluginForFile?.(absolutePath);

    if (!nodeIds.has(filePath)) {
      nodeIds.add(filePath);
      nodes.push(createGitHistoryNode(filePath));
    }

    appendGitHistoryConnectionEdges({
      connections,
      edgeSet,
      edges,
      plugin,
      sourcePath: filePath,
      workspaceRoot,
    });
  }

  return {
    nodes,
    edges: edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
  };
}
