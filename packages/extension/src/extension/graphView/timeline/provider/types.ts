import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import type { ExtensionContext } from 'vscode';

export interface GraphViewProviderTimelineAnalyzer {
  registry: unknown;
  initialize(): Promise<void>;
  getPluginFilterPatterns(): string[];
}

export interface GraphViewProviderTimelineGitAnalyzer {
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
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _applyViewTransform?(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}
