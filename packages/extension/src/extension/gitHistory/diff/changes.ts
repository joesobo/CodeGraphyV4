import type { IConnection } from '../../../core/plugins/types';
import type { IGraphEdge, IGraphNode } from '../../../shared/contracts';
import { createGitHistoryNode } from '../fullCommitAnalysis';
import { reanalyzeGraphFile, removeOutgoingGitHistoryEdges } from '../reanalyzeGraphFile';

interface DiffGraphChangeRegistry {
  analyzeFile(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IConnection[]>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
  supportsFile(filePath: string): boolean;
}

interface DiffGraphChangeOptions {
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
  registry: DiffGraphChangeRegistry;
  sha: string;
  signal: AbortSignal;
  workspaceRoot: string;
}

function addGitHistoryNodeIfMissing(
  filePath: string,
  nodeMap: Map<string, IGraphNode>,
  nodes: IGraphNode[],
): void {
  if (nodeMap.has(filePath)) {
    return;
  }

  const node = createGitHistoryNode(filePath);
  nodes.push(node);
  nodeMap.set(filePath, node);
}

export async function addGitHistoryGraphFile(
  options: DiffGraphChangeOptions,
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
    addGitHistoryNodeIfMissing(filePath, nodeMap, nodes);
    return;
  }

  await reanalyzeGraphFile({
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
  });
}

export async function modifyGitHistoryGraphFile(
  options: DiffGraphChangeOptions,
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

  removeOutgoingGitHistoryEdges(filePath, edges, edgeSet);

  await reanalyzeGraphFile({
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
  });
}
