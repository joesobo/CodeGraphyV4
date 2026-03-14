import type { ExtensionToWebviewMessage, ICommitInfo } from '../../shared/types';

interface GraphViewTimelineCache {
  getCachedCommitList(): ICommitInfo[] | null | undefined;
  invalidateCache(): PromiseLike<void>;
}

export interface GraphViewTimelinePlaybackState {
  timelineActive: boolean;
  currentCommitSha: string | undefined;
}

export function sendCachedGraphViewTimeline(
  gitAnalyzer: Pick<GraphViewTimelineCache, 'getCachedCommitList'> | undefined,
  state: GraphViewTimelinePlaybackState,
  sendMessage: (message: Extract<ExtensionToWebviewMessage, { type: 'TIMELINE_DATA' }>) => void,
): void {
  if (!gitAnalyzer) return;

  const commits = gitAnalyzer.getCachedCommitList();
  if (!commits || commits.length === 0) return;

  state.timelineActive = true;
  const latestSha = commits[commits.length - 1].sha;
  state.currentCommitSha = latestSha;

  sendMessage({
    type: 'TIMELINE_DATA',
    payload: { commits, currentSha: latestSha },
  });
}

export function sendGraphViewPlaybackSpeed(
  speed: number,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLAYBACK_SPEED_UPDATED' }>
  ) => void,
): void {
  sendMessage({
    type: 'PLAYBACK_SPEED_UPDATED',
    payload: { speed },
  });
}

export async function invalidateGraphViewTimelineCache(
  gitAnalyzer: Pick<GraphViewTimelineCache, 'invalidateCache'> | undefined,
  state: GraphViewTimelinePlaybackState,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'CACHE_INVALIDATED' }>
  ) => void,
): Promise<undefined> {
  state.timelineActive = false;
  state.currentCommitSha = undefined;

  if (gitAnalyzer) {
    await gitAnalyzer.invalidateCache();
  }

  sendMessage({ type: 'CACHE_INVALIDATED' });
  return undefined;
}
