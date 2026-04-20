import { createDefaultGraphViewProviderTimelineDependencies } from '../indexing/defaults';
import { jumpGraphViewProviderToCommit } from './jump';
import type {
  GraphViewProviderTimelineSource,
} from './contracts';
import type { GraphViewProviderTimelineDependencies } from './indexing';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function indexGraphViewProviderRepository(
  source: GraphViewProviderTimelineSource,
  dependencies: GraphViewProviderTimelineDependencies =
    createDefaultGraphViewProviderTimelineDependencies(),
): Promise<void> {
  const state = {
    analyzer: source._analyzer,
    analyzerInitialized: source._analyzerInitialized,
    gitAnalyzer: source._gitAnalyzer,
    indexingController: source._indexingController,
    filterPatterns: source._filterPatterns,
    disabledCustomFilterPatterns: dependencies.getDisabledCustomFilterPatterns(),
    disabledPluginFilterPatterns: dependencies.getDisabledPluginFilterPatterns(),
    timelineActive: source._timelineActive,
    currentCommitSha: source._currentCommitSha,
  };

  await dependencies.indexRepository(state, {
    workspaceFolder: dependencies.getWorkspaceFolder(),
    verifyGitRepository: cwd => dependencies.verifyGitRepository(cwd),
    createGitAnalyzer: (workspaceRoot, mergedExclude) =>
      dependencies.createGitAnalyzer(
        source._context,
        source._analyzer!.registry,
        workspaceRoot,
        mergedExclude,
      ),
    getMaxCommits: () => dependencies.getMaxCommits(),
    sendMessage: message => source._sendMessage(message),
    showErrorMessage: message => {
      dependencies.showErrorMessage(message);
    },
    showInformationMessage: message => {
      dependencies.showInformationMessage(message);
    },
    toErrorMessage,
    jumpToCommit: sha => {
      source._analyzerInitialized = state.analyzerInitialized;
      source._gitAnalyzer = state.gitAnalyzer;
      source._indexingController = state.indexingController;
      source._timelineActive = state.timelineActive ?? source._timelineActive;
      source._currentCommitSha = state.currentCommitSha;
      return jumpGraphViewProviderToCommit(source, sha, dependencies);
    },
    logError: (message, error) => {
      dependencies.logError(message, error);
    },
  });

  source._analyzerInitialized = state.analyzerInitialized;
  source._gitAnalyzer = state.gitAnalyzer;
  source._indexingController = state.indexingController;
  source._timelineActive = state.timelineActive ?? source._timelineActive;
  source._currentCommitSha = state.currentCommitSha;
}
