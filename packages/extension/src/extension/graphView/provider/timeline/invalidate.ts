import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './contracts';

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
