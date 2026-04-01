import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import { createDefaultGraphViewProviderTimelineDependencies } from '../indexing/defaults';
import type { ExtensionContext } from 'vscode';

interface GraphViewProviderTimelineAnalyzer {
  registry: unknown;
  initialize(): Promise<void>;
  getPluginFilterPatterns(): string[];
}

interface GraphViewProviderTimelineGitAnalyzer {
  indexHistory(
    onProgress: (phase: string, current: number, total: number) => void,
    signal: AbortSignal,
    maxCommits: number,
  ): Promise<ICommitInfo[]>;
  getCachedCommitList(): ICommitInfo[] | null | undefined;
  getGraphDataForCommit(sha: string): Promise<IGraphData>;
}

export interface GraphViewProviderTimelineSource {
  _context: ExtensionContext;
  _analyzer?: GraphViewProviderTimelineAnalyzer;
  _analyzerInitialized: boolean;
  _gitAnalyzer?: GraphViewProviderTimelineGitAnalyzer;
  _indexingController?: AbortController;
  _filterPatterns: string[];
  _timelineActive: boolean;
  _currentCommitSha: string | undefined;
  _disabledPlugins: Set<string>;
  _disabledRules: Set<string>;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderTimelineDependencies {
  getWorkspaceFolder(): { uri: { fsPath: string } } | undefined;
  getShowOrphans(): boolean;
  getMaxCommits(): number;
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
      disabledRules: Set<string>;
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

export async function jumpGraphViewProviderToCommit(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_currentCommitSha'
    | '_disabledPlugins'
    | '_disabledRules'
    | '_graphData'
    | '_sendMessage'
  >,
  sha: string,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  > = createDefaultGraphViewProviderTimelineDependencies(),
): Promise<void> {
  if (!source._gitAnalyzer) return;

  const graphData = await buildTimelineCommitGraphData(source, sha, dependencies);
  applyTimelineCommitGraph(source, sha, graphData);
}

export async function resetGraphViewProviderTimeline(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_currentCommitSha'
    | '_disabledPlugins'
    | '_disabledRules'
    | '_graphData'
    | '_sendMessage'
  >,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  > = createDefaultGraphViewProviderTimelineDependencies(),
): Promise<void> {
  const commits = source._gitAnalyzer?.getCachedCommitList();

  if (!source._gitAnalyzer || !commits || commits.length === 0) {
    return;
  }

  for (const commit of commits) {
    const graphData = await buildTimelineCommitGraphData(source, commit.sha, dependencies);

    if (graphData.nodes.length > 0) {
      applyTimelineCommitGraph(source, commit.sha, graphData);
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function buildTimelineCommitGraphData(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_disabledPlugins'
    | '_disabledRules'
  >,
  sha: string,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  >,
): Promise<IGraphData> {
  const rawGraphData = await source._gitAnalyzer!.getGraphDataForCommit(sha);

  return dependencies.buildTimelineGraphData(rawGraphData, {
    disabledPlugins: source._disabledPlugins,
    disabledRules: source._disabledRules,
    showOrphans: dependencies.getShowOrphans(),
    workspaceRoot: dependencies.getWorkspaceFolder()?.uri.fsPath,
    registry: source._analyzer?.registry,
  });
}

function applyTimelineCommitGraph(
  source: Pick<
    GraphViewProviderTimelineSource,
    '_currentCommitSha' | '_graphData' | '_sendMessage'
  >,
  sha: string,
  graphData: IGraphData,
): void {
  source._currentCommitSha = sha;
  source._graphData = graphData;
  source._sendMessage({
    type: 'COMMIT_GRAPH_DATA',
    payload: { sha, graphData },
  });
}
