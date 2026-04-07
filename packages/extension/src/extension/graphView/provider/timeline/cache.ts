import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './types';
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

  const didReplayCachedTimeline =
    state.timelineActive &&
    state.currentCommitSha !== undefined &&
    (!previousTimelineActive || state.currentCommitSha !== previousCommitSha);

  if (didReplayCachedTimeline) {
    const currentCommitSha = state.currentCommitSha;
    if (currentCommitSha) {
      await dependencies.jumpToCommit(source, currentCommitSha);
    }
  }
}

export async function invalidateGraphViewProviderTimelineCache(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: Pick<GraphViewProviderTimelineMethodDependencies, 'invalidateTimelineCache'>,
): Promise<void> {
  const state = {
    timelineActive: source._timelineActive,
    currentCommitSha: source._currentCommitSha,
  };
  const nextGitAnalyzer = await dependencies.invalidateTimelineCache(
    source._gitAnalyzer,
    state,
    message => source._sendMessage(message),
  );
  source._timelineActive = state.timelineActive;
  source._currentCommitSha = state.currentCommitSha;
  source._gitAnalyzer = nextGitAnalyzer;
}
