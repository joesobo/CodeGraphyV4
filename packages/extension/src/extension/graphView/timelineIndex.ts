import type { ExtensionToWebviewMessage, ICommitInfo } from '../../shared/types';
import { DEFAULT_EXCLUDE_PATTERNS } from '../Configuration';

interface GraphViewTimelineAnalyzerLike {
  initialize(): Promise<void>;
  getPluginFilterPatterns(): string[];
}

interface GraphViewGitAnalyzerLike {
  indexHistory(
    onProgress: (phase: string, current: number, total: number) => void,
    signal: AbortSignal,
    maxCommits: number,
  ): Promise<ICommitInfo[]>;
}

export interface GraphViewTimelineIndexState {
  analyzer: GraphViewTimelineAnalyzerLike | undefined;
  analyzerInitialized: boolean;
  gitAnalyzer: GraphViewGitAnalyzerLike | undefined;
  indexingController: AbortController | undefined;
  filterPatterns: string[];
  timelineActive?: boolean;
  currentCommitSha?: string;
}

export interface GraphViewTimelineIndexHandlers {
  workspaceFolder: { uri: { fsPath: string } } | undefined;
  verifyGitRepository(cwd: string): Promise<void>;
  createGitAnalyzer(
    workspaceRoot: string,
    mergedExclude: string[],
  ): GraphViewGitAnalyzerLike;
  getMaxCommits(): number;
  sendMessage(message: ExtensionToWebviewMessage): void;
  showErrorMessage(message: string): void;
  showInformationMessage(message: string): void;
  toErrorMessage(error: unknown): string;
  jumpToCommit(sha: string): Promise<void>;
  logError(message: string, error: unknown): void;
}

export async function indexGraphViewRepository(
  state: GraphViewTimelineIndexState,
  handlers: GraphViewTimelineIndexHandlers,
): Promise<void> {
  const workspaceFolder = handlers.workspaceFolder;
  if (!workspaceFolder) {
    handlers.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    await handlers.verifyGitRepository(workspaceFolder.uri.fsPath);
  } catch {
    handlers.showErrorMessage('This workspace is not a git repository');
    return;
  }

  state.indexingController?.abort();
  const controller = new AbortController();
  state.indexingController = controller;

  if (!state.analyzer) return;
  if (!state.analyzerInitialized) {
    await state.analyzer.initialize();
    state.analyzerInitialized = true;
  }

  if (!state.gitAnalyzer) {
    const mergedExclude = [
      ...new Set([
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...state.analyzer.getPluginFilterPatterns(),
        ...state.filterPatterns,
      ]),
    ];
    state.gitAnalyzer = handlers.createGitAnalyzer(workspaceFolder.uri.fsPath, mergedExclude);
  }

  try {
    const commits = await state.gitAnalyzer.indexHistory(
      (phase, current, total) => {
        handlers.sendMessage({
          type: 'INDEX_PROGRESS',
          payload: { phase, current, total },
        });
      },
      controller.signal,
      handlers.getMaxCommits(),
    );

    if (commits.length === 0) {
      handlers.showInformationMessage('No commits found to index');
      return;
    }

    const currentSha = commits[commits.length - 1]?.sha;
    if (!currentSha) return;

    state.timelineActive = true;
    state.currentCommitSha = currentSha;
    handlers.sendMessage({
      type: 'TIMELINE_DATA',
      payload: { commits, currentSha },
    });
    await handlers.jumpToCommit(currentSha);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    handlers.logError('[CodeGraphy] Indexing failed:', error);
    handlers.showErrorMessage(`Timeline indexing failed: ${handlers.toErrorMessage(error)}`);
    handlers.sendMessage({ type: 'CACHE_INVALIDATED' });
  }
}
