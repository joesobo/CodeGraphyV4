import * as path from 'path';
import type {
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../shared/graph/contracts';
import type { TreeSitterPathHost } from '../pipeline/plugins/treesitter/runtime/pathHost';
import { withTreeSitterPathHost } from '../pipeline/plugins/treesitter/runtime/pathHost';
import { appendGitHistoryAnalysisEdges } from './graphConnections';
import { createGitHistoryNode } from './fullCommitAnalysis';

interface ReanalyzeGraphFileRegistry {
  analyzeFileResult(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult | null>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
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
  pathHost?: TreeSitterPathHost;
  analysisContext?: IPluginAnalysisContext;
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
    pathHost,
    analysisContext,
  } = options;

  if (!registry.supportsFile(filePath)) {
    return;
  }

  const content = await getFileAtCommit(sha, filePath, signal);
  const absolutePath = path.join(workspaceRoot, filePath);
  const analysis = await withTreeSitterPathHost(
    pathHost,
    () => registry.analyzeFileResult(absolutePath, content, workspaceRoot, analysisContext),
  );
  const plugin = registry.getPluginForFile?.(absolutePath);

  if (!nodeMap.has(filePath)) {
    const node = createGitHistoryNode(filePath);
    nodes.push(node);
    nodeMap.set(filePath, node);
  }

  appendGitHistoryAnalysisEdges({
    analysis,
    edgeSet,
    edges,
    plugin,
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
