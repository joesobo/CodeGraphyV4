import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/contracts';
import type { GraphViewProviderTimelineSource } from '../../timeline/provider/contracts';

export type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export interface GraphViewProviderTimelineMethodsSource
  extends Omit<
    Pick<
      GraphViewProviderTimelineSource,
      | '_context'
      | '_analyzer'
      | '_analyzerInitialized'
      | '_gitAnalyzer'
      | '_indexingController'
      | '_filterPatterns'
      | '_timelineActive'
      | '_currentCommitSha'
      | '_disabledPlugins'
      | '_rawGraphData'
      | '_graphData'
      | '_applyViewTransform'
      | '_sendMessage'
    >,
    '_gitAnalyzer'
  > {
  _firstWorkspaceReadyPromise?: Promise<void>;
  _analyzerInitPromise?: Promise<void>;
  _installedPluginActivationPromise?: Promise<void>;
  _gitAnalyzer?: GraphViewProviderTimelineSource['_gitAnalyzer'] & {
    invalidateCache(): PromiseLike<void>;
    getCachedCommitList(): ICommitInfo[] | null | undefined;
  };
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _openFile(filePath: string, behavior?: EditorOpenBehavior): Promise<void>;
}

export interface GraphViewProviderTimelineMethods {
  _indexRepository(): Promise<void>;
  _jumpToCommit(sha: string): Promise<void>;
  _resetTimeline(): Promise<void>;
  _openSelectedNode(nodeId: string): Promise<void>;
  _activateNode(nodeId: string): Promise<void>;
  _openNodeInEditor(nodeId: string, behavior: EditorOpenBehavior): Promise<void>;
  _previewFileAtCommit(
    sha: string,
    filePath: string,
    behavior?: EditorOpenBehavior,
  ): Promise<void>;
  _sendCachedTimeline(): Promise<void>;
  sendPlaybackSpeed(): void;
  invalidateTimelineCache(): Promise<void>;
}

export interface GraphViewProviderTimelineMethodDependencies {
  indexRepository(
    source: Parameters<typeof import('../../timeline/provider/indexing').indexGraphViewProviderRepository>[0],
  ): Promise<void>;
  jumpToCommit(
    source: Parameters<typeof import('../../timeline/provider/indexing').jumpGraphViewProviderToCommit>[0],
    sha: string,
  ): Promise<void>;
  resetTimeline(
    source: Parameters<typeof import('../../timeline/provider/indexing').resetGraphViewProviderTimeline>[0],
  ): Promise<void>;
  openNodeInEditor(
    nodeId: string,
    state: {
      timelineActive: boolean;
      currentCommitSha: string | undefined;
    },
    handlers: {
      previewFileAtCommit(
        sha: string,
        filePath: string,
        behavior?: EditorOpenBehavior,
      ): Promise<void>;
      openFile(
        filePath: string,
        behavior?: EditorOpenBehavior,
      ): Promise<void>;
    },
    behavior: EditorOpenBehavior,
  ): Promise<void>;
  previewFileAtCommit(
    sha: string,
    filePath: string,
    handlers: {
      workspaceFolder: vscode.WorkspaceFolder | undefined;
      openTextDocument(fileUri: vscode.Uri): Thenable<vscode.TextDocument>;
      showTextDocument(
        document: vscode.TextDocument,
        options: EditorOpenBehavior,
      ): Thenable<vscode.TextEditor>;
      logError(message: string, error: unknown): void;
    },
    behavior: EditorOpenBehavior,
  ): Promise<void>;
  sendCachedTimeline(
    gitAnalyzer: GraphViewProviderTimelineMethodsSource['_gitAnalyzer'],
    state: {
      timelineActive: boolean;
      currentCommitSha: string | undefined;
    },
    sendMessage: (message: ExtensionToWebviewMessage) => void,
  ): void;
  createGitAnalyzer?(
    context: GraphViewProviderTimelineMethodsSource['_context'],
    registry: NonNullable<GraphViewProviderTimelineMethodsSource['_analyzer']>['registry'],
    workspaceRoot: string,
    mergedExclude: string[],
  ): NonNullable<GraphViewProviderTimelineMethodsSource['_gitAnalyzer']>;
  sendPlaybackSpeed(
    playbackSpeed: number,
    sendMessage: (message: ExtensionToWebviewMessage) => void,
  ): void;
  invalidateTimelineCache(
    gitAnalyzer: GraphViewProviderTimelineMethodsSource['_gitAnalyzer'],
    state: {
      timelineActive: boolean;
      currentCommitSha: string | undefined;
    },
    sendMessage: (message: ExtensionToWebviewMessage) => void,
  ): Promise<GraphViewProviderTimelineMethodsSource['_gitAnalyzer']>;
  getPlaybackSpeed(): number;
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  openTextDocument(fileUri: vscode.Uri): Thenable<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    options: EditorOpenBehavior,
  ): Thenable<vscode.TextEditor>;
  logError(message: string, error: unknown): void;
}
