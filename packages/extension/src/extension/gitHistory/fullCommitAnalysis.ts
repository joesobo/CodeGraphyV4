import * as path from 'path';
import type {
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '../../core/plugins/types/contracts';
import { getFileColor } from '../../shared/fileColors';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../shared/graph/contracts';
import { createGitHistoryCommitPathHost } from './commitPathHost';
import { createGitHistoryAnalysisContext } from './analysisContext';
import { appendGitHistoryAnalysisEdges } from './graphConnections';
import { preAnalyzeGitHistoryPlugins } from './preAnalyze';
import { withTreeSitterPathHost } from '../pipeline/plugins/treesitter/runtime/pathHost';

interface FullCommitAnalysisRegistry {
  analyzeFileResult(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult | null>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
  notifyPreAnalyze(
    files: Array<{
      absolutePath: string;
      relativePath: string;
      content: string;
    }>,
    workspaceRoot: string,
    context: IPluginAnalysisContext,
  ): Promise<void>;
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

    const extension = path.extname(filePath).toLowerCase();
    return supportedExtensions.has('*') || supportedExtensions.has(extension);
  });

  const nodes: IGraphNode[] = [];
  const edges: IGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeSet = new Set<string>();
  const analysisContext = createGitHistoryAnalysisContext({
    allFiles,
    getFileAtCommit,
    sha,
    signal,
    workspaceRoot,
  });
  await preAnalyzeGitHistoryPlugins({
    allFiles: allFiles.filter((filePath) => !shouldExclude(filePath)),
    getFileAtCommit,
    registry,
    sha,
    signal,
    workspaceRoot,
  }, analysisContext);
  const pathHost = await createGitHistoryCommitPathHost({
    allFiles,
    getFileAtCommit,
    sha,
    signal,
    workspaceRoot,
  });

  for (const filePath of files) {
    if (signal.aborted) {
      const error = new Error('Indexing aborted');
      error.name = 'AbortError';
      throw error;
    }

    const content = await getFileAtCommit(sha, filePath, signal);
    const absolutePath = path.join(workspaceRoot, filePath);
    const analysis = await withTreeSitterPathHost(
      pathHost,
      () => registry.analyzeFileResult(absolutePath, content, workspaceRoot, analysisContext),
    );
    const plugin = registry.getPluginForFile?.(absolutePath);

    if (!nodeIds.has(filePath)) {
      nodeIds.add(filePath);
      nodes.push(createGitHistoryNode(filePath));
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

  return {
    nodes,
    edges: edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
  };
}
