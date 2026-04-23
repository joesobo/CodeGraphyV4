import type {
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '../../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import type { TreeSitterPathHost } from '../../pipeline/plugins/treesitter/runtime/pathHost';
import { reanalyzeGraphFile, removeOutgoingGitHistoryEdges } from '../reanalyzeGraphFile';

interface DiffGraphChangeRegistry {
  analyzeFileResult(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult | null>;
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
  pathHost?: TreeSitterPathHost;
  analysisContext?: IPluginAnalysisContext;
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
    pathHost,
    analysisContext,
  } = options;

  if (!registry.supportsFile(filePath)) {
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
    pathHost,
    analysisContext,
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
    pathHost,
    analysisContext,
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
    pathHost,
    analysisContext,
  });
}
