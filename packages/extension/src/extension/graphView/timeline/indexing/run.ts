import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import { applyGraphViewTimelineIndexResult } from './result';

interface GraphViewGitAnalyzerLike {
  indexHistory(
    onProgress: (phase: string, current: number, total: number) => void,
    signal: AbortSignal,
    maxCommits: number,
  ): Promise<ICommitInfo[]>;
}

export interface GraphViewTimelineIndexExecutionState {
  gitAnalyzer: GraphViewGitAnalyzerLike;
  indexingController: AbortController;
  timelineActive?: boolean;
  currentCommitSha?: string;
}

export interface GraphViewTimelineIndexExecutionHandlers {
  getMaxCommits(): number;
  sendMessage(message: ExtensionToWebviewMessage): void;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
  toErrorMessage(error: unknown): string;
  jumpToCommit(sha: string): Promise<void>;
  logError(message: string, error: unknown): void;
}

export async function runGraphViewTimelineIndex(
  state: GraphViewTimelineIndexExecutionState,
  handlers: GraphViewTimelineIndexExecutionHandlers,
): Promise<void> {
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
