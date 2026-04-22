import type { IFileAnalysisResult } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import { createGitHistoryCommitPathHost } from '../commitPathHost';
import { preAnalyzeGitHistoryPlugins } from '../preAnalyze';
import { addGitHistoryGraphFile, modifyGitHistoryGraphFile } from './changes';
import {
  createDiffGraphSnapshot,
  filterDanglingDiffGraphEdges,
} from './snapshot';
import { deleteGitHistoryGraphFile, renameGitHistoryGraphFile } from './state';
import { reanalyzeGraphFile } from '../reanalyzeGraphFile';

interface DiffGraphRegistry {
  analyzeFileResult(
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IFileAnalysisResult | null>;
  getPluginForFile?(absolutePath: string): { id: string } | undefined;
  notifyPreAnalyze(
    files: Array<{
      absolutePath: string;
      relativePath: string;
      content: string;
    }>,
    workspaceRoot: string,
  ): Promise<void>;
  supportsFile(filePath: string): boolean;
}

export interface AnalyzeDiffCommitGraphOptions {
  diffOutput: string;
  commitFiles: readonly string[];
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

interface DiffAnalysisContext {
  edgeSet: Set<string>;
  edges: IGraphData['edges'];
  getFileAtCommit: AnalyzeDiffCommitGraphOptions['getFileAtCommit'];
  nodeMap: Map<string, IGraphData['nodes'][number]>;
  nodes: IGraphData['nodes'];
  pathHost: Awaited<ReturnType<typeof createGitHistoryCommitPathHost>>;
  registry: DiffGraphRegistry;
  sha: string;
  signal: AbortSignal;
  trackedFiles: Set<string>;
  workspaceRoot: string;
}

type ParsedDiffLine =
  | { kind: 'add'; filePath: string }
  | { kind: 'delete'; filePath: string }
  | { kind: 'modify'; filePath: string }
  | { kind: 'rename'; oldPath: string; newPath: string }
  | { kind: 'ignore' };

export async function analyzeDiffCommitGraph(
  options: AnalyzeDiffCommitGraphOptions,
): Promise<IGraphData> {
  const {
    diffOutput,
    commitFiles,
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
  const trackedFiles = new Set(commitFiles.filter((filePath) => {
    return !shouldExclude(filePath) && registry.supportsFile(filePath);
  }));
  await preAnalyzeGitHistoryPlugins({
    allFiles: commitFiles.filter((filePath) => !shouldExclude(filePath)),
    getFileAtCommit,
    registry,
    sha,
    signal,
    workspaceRoot,
  });
  const pathHost = await createGitHistoryCommitPathHost({
    allFiles: commitFiles,
    getFileAtCommit,
    sha,
    signal,
    workspaceRoot,
  });
  const context: DiffAnalysisContext = {
    edgeSet,
    edges,
    getFileAtCommit,
    nodeMap,
    nodes,
    pathHost,
    registry,
    sha,
    signal,
    trackedFiles,
    workspaceRoot,
  };

  for (const line of lines) {
    assertDiffAnalysisActive(signal);
    await handleDiffLine(parseDiffLine(line), context);
  }

  return {
    nodes,
    edges: filterDanglingDiffGraphEdges(nodes, edges),
  };
}

async function handleDiffLine(
  diffLine: ParsedDiffLine,
  context: DiffAnalysisContext,
): Promise<void> {
  switch (diffLine.kind) {
    case 'rename':
      await handleRename(diffLine.oldPath, diffLine.newPath, context);
      return;
    case 'add':
      await handleAddition(diffLine.filePath, context);
      return;
    case 'modify':
      await handleModification(diffLine.filePath, context);
      return;
    case 'delete':
      deleteTrackedFile(diffLine.filePath, context);
      return;
    case 'ignore':
      return;
  }
}

async function handleRename(
  oldPath: string,
  newPath: string,
  context: DiffAnalysisContext,
): Promise<void> {
  if (!context.trackedFiles.has(newPath)) {
    deleteTrackedFile(oldPath, context);
    return;
  }

  renameGitHistoryGraphFile(
    oldPath,
    newPath,
    context.edges,
    context.nodeMap,
    context.edgeSet,
  );
  await reanalyzeTrackedFile(newPath, context);
}

async function handleAddition(
  filePath: string,
  context: DiffAnalysisContext,
): Promise<void> {
  if (!context.trackedFiles.has(filePath)) {
    return;
  }

  await addGitHistoryGraphFile(buildTrackedFileOptions(filePath, context));
}

async function handleModification(
  filePath: string,
  context: DiffAnalysisContext,
): Promise<void> {
  if (!context.trackedFiles.has(filePath)) {
    deleteTrackedFile(filePath, context);
    return;
  }

  await modifyGitHistoryGraphFile(buildTrackedFileOptions(filePath, context));
}

function deleteTrackedFile(filePath: string, context: DiffAnalysisContext): void {
  deleteGitHistoryGraphFile(
    filePath,
    context.nodes,
    context.edges,
    context.nodeMap,
    context.edgeSet,
  );
}

async function reanalyzeTrackedFile(
  filePath: string,
  context: DiffAnalysisContext,
): Promise<void> {
  await reanalyzeGraphFile(buildTrackedFileOptions(filePath, context));
}

function buildTrackedFileOptions(filePath: string, context: DiffAnalysisContext) {
  return {
    edgeSet: context.edgeSet,
    edges: context.edges,
    filePath,
    getFileAtCommit: context.getFileAtCommit,
    nodeMap: context.nodeMap,
    nodes: context.nodes,
    registry: context.registry,
    sha: context.sha,
    signal: context.signal,
    workspaceRoot: context.workspaceRoot,
    pathHost: context.pathHost,
  };
}

function parseDiffLine(line: string): ParsedDiffLine {
  const [status, firstPath, secondPath] = line.split('\t');

  return parseRenameDiffLine(status, firstPath, secondPath)
    ?? parseSinglePathDiffLine(status, firstPath)
    ?? { kind: 'ignore' };
}

function assertDiffAnalysisActive(signal: AbortSignal): void {
  if (!signal.aborted) {
    return;
  }

  const error = new Error('Indexing aborted');
  error.name = 'AbortError';
  throw error;
}

function parseRenameDiffLine(
  status: string,
  oldPath?: string,
  newPath?: string,
): ParsedDiffLine | null {
  if (!status.startsWith('R') || !oldPath || !newPath) {
    return null;
  }

  return {
    kind: 'rename',
    oldPath,
    newPath,
  };
}

function parseSinglePathDiffLine(
  status: string,
  filePath?: string,
): ParsedDiffLine | null {
  if (!filePath) {
    return null;
  }

  return singlePathDiffFactories[status]?.(filePath) ?? null;
}

const singlePathDiffFactories: Record<
  string,
  (filePath: string) => Extract<ParsedDiffLine, { filePath: string }>
> = {
  'A': (filePath) => ({ kind: 'add', filePath }),
  'D': (filePath) => ({ kind: 'delete', filePath }),
  'M': (filePath) => ({ kind: 'modify', filePath }),
};
