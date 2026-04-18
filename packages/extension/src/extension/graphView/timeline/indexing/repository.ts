import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/contracts';
import {
  runGraphViewTimelineIndex,
  type GraphViewTimelineIndexExecutionState,
} from './run';
import { prepareGraphViewTimelineIndex } from './setup';

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

  const executionState = state as GraphViewTimelineIndexExecutionState;

  await runGraphViewTimelineIndex(
    executionState,
    {
      getMaxCommits: () => handlers.getMaxCommits(),
      sendMessage: message => handlers.sendMessage(message),
      showInformationMessage: message => handlers.showInformationMessage(message),
      showErrorMessage: message => handlers.showErrorMessage(message),
      toErrorMessage: error => handlers.toErrorMessage(error),
      jumpToCommit: sha => handlers.jumpToCommit(sha),
      logError: (message, error) => handlers.logError(message, error),
    },
  );
}
