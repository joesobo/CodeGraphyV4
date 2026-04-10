import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './contracts';
import { ensureGitAnalyzerForCachedTimeline } from './warmup';

export async function sendGraphViewProviderCachedTimeline(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: GraphViewProviderTimelineMethodDependencies,
): Promise<void> {
  const state = {
    timelineActive: source._timelineActive,
    currentCommitSha: source._currentCommitSha,
  };
  const previousTimelineActive = state.timelineActive;
  const previousCommitSha = state.currentCommitSha;

  await ensureGitAnalyzerForCachedTimeline(source, dependencies);
  dependencies.sendCachedTimeline(
    source._gitAnalyzer,
    state,
    message => source._sendMessage(message),
  );
  source._timelineActive = state.timelineActive;
  source._currentCommitSha = state.currentCommitSha;

  const currentCommitSha = state.currentCommitSha;
  const shouldJumpToReplayedCommit =
    state.timelineActive &&
    !!currentCommitSha &&
    (!previousTimelineActive || currentCommitSha !== previousCommitSha);

  if (shouldJumpToReplayedCommit) {
    await dependencies.jumpToCommit(source, currentCommitSha);
  }
}
