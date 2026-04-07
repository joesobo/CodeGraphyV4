import { DEFAULT_EXCLUDE_PATTERNS } from '../../../config/defaults';
import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './types';

async function ensureGitAnalyzerForCachedTimeline(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: Pick<
    GraphViewProviderTimelineMethodDependencies,
    'createGitAnalyzer' | 'getWorkspaceFolder'
  >,
): Promise<void> {
  if (source._gitAnalyzer || !source._analyzer) {
    return;
  }

  if (!dependencies.createGitAnalyzer) {
    return;
  }

  const workspaceFolder = dependencies.getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  await (source._installedPluginActivationPromise ?? Promise.resolve());

  if (!source._analyzerInitialized) {
    if (!source._analyzerInitPromise) {
      source._analyzerInitPromise = source._analyzer
        .initialize()
        .then(() => {
          source._analyzerInitialized = true;
        })
        .finally(() => {
          source._analyzerInitPromise = undefined;
        });
    }

    await source._analyzerInitPromise;
  }

  const mergedExclude = [
    ...new Set([
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...source._analyzer.getPluginFilterPatterns(),
      ...source._filterPatterns,
    ]),
  ];

  source._gitAnalyzer = dependencies.createGitAnalyzer(
    source._context,
    source._analyzer.registry,
    workspaceFolder.uri.fsPath,
    mergedExclude,
  );
}

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
