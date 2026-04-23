import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/contracts';

export interface GraphViewTimelineIndexResultState {
  timelineActive?: boolean;
  currentCommitSha?: string;
}

export interface GraphViewTimelineIndexResultHandlers {
  sendMessage(message: ExtensionToWebviewMessage): void;
  showInformationMessage(message: string): void;
  jumpToCommit(sha: string): Promise<void>;
}

export async function applyGraphViewTimelineIndexResult(
  commits: ICommitInfo[],
  state: GraphViewTimelineIndexResultState,
  handlers: GraphViewTimelineIndexResultHandlers,
): Promise<void> {
  if (commits.length === 0) {
    handlers.showInformationMessage('No commits found to index');
    handlers.sendMessage({ type: 'CACHE_INVALIDATED' });
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
}
