import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGraphData } from '../../shared/types';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  sendGraphViewProviderCachedTimeline,
} from './providerTimeline';
import {
  invalidateGraphViewTimelineCache,
  sendGraphViewPlaybackSpeed,
} from './timelinePlayback';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from './timelineOpen';

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export interface GraphViewProviderTimelineMethodsSource {
  _context: vscode.ExtensionContext;
  _analyzer?: {
    registry: unknown;
    initialize(): Promise<void>;
    getPluginFilterPatterns(): string[];
  };
  _analyzerInitialized: boolean;
  _gitAnalyzer?: {
    invalidateCache(): PromiseLike<void>;
    getCachedCommitList(): unknown;
    getGraphDataForCommit(sha: string): Promise<IGraphData>;
  };
  _indexingController?: AbortController;
  _filterPatterns: string[];
  _timelineActive: boolean;
  _currentCommitSha: string | undefined;
  _disabledPlugins: Set<string>;
  _disabledRules: Set<string>;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _openFile(filePath: string, behavior?: EditorOpenBehavior): Promise<void>;
}

export interface GraphViewProviderTimelineMethods {
  _indexRepository(): Promise<void>;
  _jumpToCommit(sha: string): Promise<void>;
  _openSelectedNode(nodeId: string): Promise<void>;
  _activateNode(nodeId: string): Promise<void>;
  _openNodeInEditor(nodeId: string, behavior: EditorOpenBehavior): Promise<void>;
  _previewFileAtCommit(
    sha: string,
    filePath: string,
    behavior?: EditorOpenBehavior,
  ): Promise<void>;
  _sendCachedTimeline(): void;
  sendPlaybackSpeed(): void;
  invalidateTimelineCache(): Promise<void>;
}

export interface GraphViewProviderTimelineMethodDependencies {
  indexRepository: typeof indexGraphViewProviderRepository;
  jumpToCommit: typeof jumpGraphViewProviderToCommit;
  openNodeInEditor: typeof openGraphViewNodeInEditor;
  previewFileAtCommit: typeof previewGraphViewFileAtCommit;
  sendCachedTimeline: typeof sendGraphViewProviderCachedTimeline;
  sendPlaybackSpeed: typeof sendGraphViewPlaybackSpeed;
  invalidateTimelineCache: typeof invalidateGraphViewTimelineCache;
  getPlaybackSpeed(): number;
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  openTextDocument(fileUri: vscode.Uri): Thenable<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    options: EditorOpenBehavior,
  ): Thenable<vscode.TextEditor>;
  logError(message: string, error: unknown): void;
}

const DEFAULT_TIMELINE_PREVIEW_BEHAVIOR: EditorOpenBehavior = {
  preview: true,
  preserveFocus: false,
};

const TEMPORARY_NODE_OPEN_BEHAVIOR: EditorOpenBehavior = {
  preview: true,
  preserveFocus: true,
};

const PERMANENT_NODE_OPEN_BEHAVIOR: EditorOpenBehavior = {
  preview: false,
  preserveFocus: false,
};

const DEFAULT_DEPENDENCIES: GraphViewProviderTimelineMethodDependencies = {
  indexRepository: indexGraphViewProviderRepository,
  jumpToCommit: jumpGraphViewProviderToCommit,
  openNodeInEditor: openGraphViewNodeInEditor,
  previewFileAtCommit: previewGraphViewFileAtCommit,
  sendCachedTimeline: sendGraphViewProviderCachedTimeline,
  sendPlaybackSpeed: sendGraphViewPlaybackSpeed,
  invalidateTimelineCache: invalidateGraphViewTimelineCache,
  getPlaybackSpeed: () =>
    vscode.workspace.getConfiguration('codegraphy').get<number>('timeline.playbackSpeed', 1.0),
  getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
  openTextDocument: fileUri => vscode.workspace.openTextDocument(fileUri),
  showTextDocument: (document, options) => vscode.window.showTextDocument(document, options),
  logError: (message, error) => {
    console.error(message, error);
  },
};

export function createGraphViewProviderTimelineMethods(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: GraphViewProviderTimelineMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderTimelineMethods {
  const _previewFileAtCommit = async (
    sha: string,
    filePath: string,
    behavior: EditorOpenBehavior = DEFAULT_TIMELINE_PREVIEW_BEHAVIOR,
  ): Promise<void> => {
    await dependencies.previewFileAtCommit(
      sha,
      filePath,
      {
        workspaceFolder: dependencies.getWorkspaceFolder(),
        openTextDocument: fileUri => dependencies.openTextDocument(fileUri),
        showTextDocument: (document, nextBehavior) =>
          dependencies.showTextDocument(document, nextBehavior),
        logError: (message, error) => {
          dependencies.logError(message, error);
        },
      },
      behavior,
    );
  };

  const _openNodeInEditor = async (
    nodeId: string,
    behavior: EditorOpenBehavior,
  ): Promise<void> => {
    await dependencies.openNodeInEditor(
      nodeId,
      {
        timelineActive: source._timelineActive,
        currentCommitSha: source._currentCommitSha,
      },
      {
        previewFileAtCommit: (sha, filePath, nextBehavior) =>
          _previewFileAtCommit(sha, filePath, nextBehavior),
        openFile: (filePath, nextBehavior) => source._openFile(filePath, nextBehavior),
      },
      behavior,
    );
  };

  const _indexRepository = async (): Promise<void> => {
    await dependencies.indexRepository(source as never);
  };

  const _jumpToCommit = async (sha: string): Promise<void> => {
    await dependencies.jumpToCommit(source as never, sha);
  };

  const _openSelectedNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, TEMPORARY_NODE_OPEN_BEHAVIOR);
  };

  const _activateNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, PERMANENT_NODE_OPEN_BEHAVIOR);
  };

  const _sendCachedTimeline = (): void => {
    dependencies.sendCachedTimeline(source as never);
  };

  const sendPlaybackSpeed = (): void => {
    dependencies.sendPlaybackSpeed(dependencies.getPlaybackSpeed(), message =>
      source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const invalidateTimelineCache = async (): Promise<void> => {
    const state = {
      timelineActive: source._timelineActive,
      currentCommitSha: source._currentCommitSha,
    };
    const nextGitAnalyzer = await dependencies.invalidateTimelineCache(
      source._gitAnalyzer,
      state,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
    source._timelineActive = state.timelineActive;
    source._currentCommitSha = state.currentCommitSha;
    source._gitAnalyzer = nextGitAnalyzer;
  };

  return {
    _indexRepository,
    _jumpToCommit,
    _openSelectedNode,
    _activateNode,
    _openNodeInEditor,
    _previewFileAtCommit,
    _sendCachedTimeline,
    sendPlaybackSpeed,
    invalidateTimelineCache,
  };
}
