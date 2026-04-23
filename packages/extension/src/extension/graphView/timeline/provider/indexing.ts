import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ExtensionContext } from 'vscode';
import { createDefaultGraphViewProviderTimelineDependencies } from '../indexing/defaults';
import { applyTimelineCommitGraph, buildTimelineCommitGraphData } from './commitData';
import type {
  GraphViewProviderTimelineAnalyzer,
  GraphViewProviderTimelineGitAnalyzer,
  GraphViewProviderTimelineSource,
} from './contracts';
export { indexGraphViewProviderRepository } from './repository';
export { jumpGraphViewProviderToCommit } from './jump';

export interface GraphViewProviderTimelineDependencies {
  getWorkspaceFolder(): { uri: { fsPath: string } } | undefined;
  getShowOrphans(): boolean;
  getMaxCommits(): number;
  getDisabledCustomFilterPatterns(): string[];
  getDisabledPluginFilterPatterns(): string[];
  verifyGitRepository(cwd: string): Promise<void>;
  createGitAnalyzer(
    context: ExtensionContext,
    registry: unknown,
    workspaceRoot: string,
    mergedExclude: string[],
  ): GraphViewProviderTimelineGitAnalyzer;
  showErrorMessage(message: string): void;
  showInformationMessage(message: string): void;
  buildTimelineGraphData(
    rawGraphData: IGraphData,
    options: {
      disabledPlugins: Set<string>;
      showOrphans: boolean;
      workspaceRoot: string | undefined;
      registry: unknown;
    },
  ): IGraphData;
  indexRepository(
    state: {
      analyzer: GraphViewProviderTimelineAnalyzer | undefined;
      analyzerInitialized: boolean;
      gitAnalyzer: GraphViewProviderTimelineGitAnalyzer | undefined;
      indexingController: AbortController | undefined;
      filterPatterns: string[];
      disabledCustomFilterPatterns?: string[];
      disabledPluginFilterPatterns?: string[];
      timelineActive?: boolean;
      currentCommitSha?: string;
    },
    handlers: {
      workspaceFolder: { uri: { fsPath: string } } | undefined;
      verifyGitRepository(cwd: string): Promise<void>;
      createGitAnalyzer(
        workspaceRoot: string,
        mergedExclude: string[],
      ): GraphViewProviderTimelineGitAnalyzer;
      getMaxCommits(): number;
      sendMessage(message: ExtensionToWebviewMessage): void;
      showErrorMessage(message: string): void;
      showInformationMessage(message: string): void;
      toErrorMessage(error: unknown): string;
      jumpToCommit(sha: string): Promise<void>;
      logError(message: string, error: unknown): void;
    },
  ): Promise<void>;
  sendCachedTimeline(
    gitAnalyzer: GraphViewProviderTimelineGitAnalyzer | undefined,
    state: {
      timelineActive: boolean;
      currentCommitSha: string | undefined;
    },
    sendMessage: (message: ExtensionToWebviewMessage) => void,
  ): void;
  logError(message: string, error: unknown): void;
}

export async function resetGraphViewProviderTimeline(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_currentCommitSha'
    | '_disabledPlugins'
    | '_rawGraphData'
    | '_graphData'
    | '_computeMergedGroups'
    | '_sendGroupsUpdated'
    | '_applyViewTransform'
    | '_sendMessage'
  >,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  > = createDefaultGraphViewProviderTimelineDependencies(),
): Promise<void> {
  const commits = source._gitAnalyzer?.getCachedCommitList();

  if (!source._gitAnalyzer || !commits) {
    return;
  }

  for (const commit of commits) {
    const graphData = await buildTimelineCommitGraphData(source, commit.sha, dependencies);

    if (graphData.nodes.length > 0) {
      applyTimelineCommitGraph(source, commit.sha, graphData);
      source._computeMergedGroups?.();
      source._sendGroupsUpdated?.();
      return;
    }
  }
}

export function sendGraphViewProviderCachedTimeline(
  source: Pick<
    GraphViewProviderTimelineSource,
    '_gitAnalyzer' | '_timelineActive' | '_currentCommitSha' | '_sendMessage'
  >,
  dependencies: Pick<GraphViewProviderTimelineDependencies, 'sendCachedTimeline'> =
    createDefaultGraphViewProviderTimelineDependencies(),
): void {
  const state = {
    timelineActive: source._timelineActive,
    currentCommitSha: source._currentCommitSha,
  };

  dependencies.sendCachedTimeline(source._gitAnalyzer, state, message =>
    source._sendMessage(message),
  );
  source._timelineActive = state.timelineActive;
  source._currentCommitSha = state.currentCommitSha;
}
