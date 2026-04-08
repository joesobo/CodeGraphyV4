import * as path from 'path';
import type { IConnection } from '../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../shared/graph/types';
import { appendGitHistoryConnectionEdges } from './graphConnections';
import { createGitHistoryNode } from './fullCommitAnalysis';

interface ReanalyzeGraphFileRegistry {
  analyzeFile(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IConnection[]>;
  supportsFile(filePath: string): boolean;
}

export interface ReanalyzeGraphFileOptions {
  edgeSet: Set<string>;
  edges: IGraphEdge[];
  filePath: string;
  getFileAtCommit: (
    sha: string,
    filePath: string,
    signal: AbortSignal,
  ) => Promise<string>;
  nodeMap: Map<string, IGraphNode>;
  nodes: IGraphNode[];
  registry: ReanalyzeGraphFileRegistry;
  sha: string;
  signal: AbortSignal;
  workspaceRoot: string;
}

export async function reanalyzeGraphFile(
  options: ReanalyzeGraphFileOptions,
): Promise<void> {
  const {
    edgeSet,
    edges,
    filePath,
    getFileAtCommit,
    nodeMap,
    nodes,
    registry,
    sha,
    signal,
    workspaceRoot,
  } = options;

  if (!registry.supportsFile(filePath)) {
    return;
  }

  const content = await getFileAtCommit(sha, filePath, signal);
  const absolutePath = path.join(workspaceRoot, filePath);
  const connections = await registry.analyzeFile(absolutePath, content, workspaceRoot);

  if (!nodeMap.has(filePath)) {
    const node = createGitHistoryNode(filePath);
    nodes.push(node);
    nodeMap.set(filePath, node);
  }

  appendGitHistoryConnectionEdges({
    connections,
    edgeSet,
    edges,
    sourcePath: filePath,
    workspaceRoot,
  });
}

export function removeOutgoingGitHistoryEdges(
  filePath: string,
  edges: IGraphEdge[],
  edgeSet: Set<string>,
): void {
  for (let index = edges.length - 1; index >= 0; index--) {
    if (edges[index].from !== filePath) {
      continue;
    }

    edgeSet.delete(edges[index].id);
    edges.splice(index, 1);
  }
}
