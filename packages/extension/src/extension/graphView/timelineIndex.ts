import type { ExtensionToWebviewMessage, ICommitInfo } from '../../shared/types';
import { applyGraphViewTimelineIndexResult } from './timelineIndexResult';
import { prepareGraphViewTimelineIndex } from './timelineIndexSetup';

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
  const ready = await prepareGraphViewTimelineIndex(state, {
    workspaceFolder: handlers.workspaceFolder,
    verifyGitRepository: cwd => handlers.verifyGitRepository(cwd),
    createGitAnalyzer: (workspaceRoot, mergedExclude) =>
      handlers.createGitAnalyzer(workspaceRoot, mergedExclude),
    showErrorMessage: message => handlers.showErrorMessage(message),
  });
  if (!ready || !state.gitAnalyzer || !state.indexingController) return;

  try {
    const commits = await state.gitAnalyzer.indexHistory(
      (phase, current, total) => {
        handlers.sendMessage({
          type: 'INDEX_PROGRESS',
          payload: { phase, current, total },
        });
      },
      state.indexingController.signal,
      handlers.getMaxCommits(),
    );
    await applyGraphViewTimelineIndexResult(commits, state, {
      sendMessage: message => handlers.sendMessage(message),
      showInformationMessage: message => handlers.showInformationMessage(message),
      jumpToCommit: sha => handlers.jumpToCommit(sha),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    handlers.logError('[CodeGraphy] Indexing failed:', error);
    handlers.showErrorMessage(`Timeline indexing failed: ${handlers.toErrorMessage(error)}`);
    handlers.sendMessage({ type: 'CACHE_INVALIDATED' });
  }
}
