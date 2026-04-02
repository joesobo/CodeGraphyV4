import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../config/defaults';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import type { GraphViewProviderTimelineSource } from '../../timeline/provider/indexing';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  resetGraphViewProviderTimeline,
  sendGraphViewProviderCachedTimeline,
} from '../../timeline/provider/indexing';
import {
  invalidateGraphViewTimelineCache,
  sendGraphViewPlaybackSpeed,
} from '../../timeline/playback';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from '../../timeline/open';

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

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
    | '_disabledRules'
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
    source: Parameters<typeof indexGraphViewProviderRepository>[0],
  ): Promise<void>;
  jumpToCommit(
    source: Parameters<typeof jumpGraphViewProviderToCommit>[0],
    sha: string,
  ): Promise<void>;
  resetTimeline(
    source: Parameters<typeof resetGraphViewProviderTimeline>[0],
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
    source: Parameters<typeof sendGraphViewProviderCachedTimeline>[0],
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

function createDefaultTimelinePreviewBehavior(): EditorOpenBehavior {
  return {
    preview: true,
    preserveFocus: false,
  };
}

function createTemporaryNodeOpenBehavior(): EditorOpenBehavior {
  return {
    preview: true,
    preserveFocus: true,
  };
}

function createPermanentNodeOpenBehavior(): EditorOpenBehavior {
  return {
    preview: false,
    preserveFocus: false,
  };
}

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

function createDefaultDependencies(): GraphViewProviderTimelineMethodDependencies {
  return {
    indexRepository: indexGraphViewProviderRepository,
    jumpToCommit: jumpGraphViewProviderToCommit,
    resetTimeline: resetGraphViewProviderTimeline,
    openNodeInEditor: openGraphViewNodeInEditor,
    previewFileAtCommit: previewGraphViewFileAtCommit,
    sendCachedTimeline: sendGraphViewProviderCachedTimeline,
    createGitAnalyzer: (context, registry, workspaceRoot, mergedExclude) =>
      new GitHistoryAnalyzer(context, registry as PluginRegistry, workspaceRoot, mergedExclude),
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
}

export function createGraphViewProviderTimelineMethods(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: GraphViewProviderTimelineMethodDependencies = createDefaultDependencies(),
): GraphViewProviderTimelineMethods {
  const _previewFileAtCommit = async (
    sha: string,
    filePath: string,
    behavior: EditorOpenBehavior = createDefaultTimelinePreviewBehavior(),
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
    await source._firstWorkspaceReadyPromise;
    await dependencies.indexRepository(source);
  };

  const _jumpToCommit = async (sha: string): Promise<void> => {
    await dependencies.jumpToCommit(source, sha);
  };

  const _resetTimeline = async (): Promise<void> => {
    await dependencies.resetTimeline(source);
  };

  const _openSelectedNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, createTemporaryNodeOpenBehavior());
  };

  const _activateNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, createPermanentNodeOpenBehavior());
  };

  const _sendCachedTimeline = async (): Promise<void> => {
    const previousTimelineActive = source._timelineActive;
    const previousCommitSha = source._currentCommitSha;

    await ensureGitAnalyzerForCachedTimeline(source, dependencies);
    dependencies.sendCachedTimeline(source);

    const didReplayCachedTimeline =
      source._timelineActive &&
      source._currentCommitSha !== undefined &&
      (!previousTimelineActive || source._currentCommitSha !== previousCommitSha);

    if (didReplayCachedTimeline) {
      const currentCommitSha = source._currentCommitSha;
      if (currentCommitSha) {
        await dependencies.jumpToCommit(source, currentCommitSha);
      }
    }
  };

  const sendPlaybackSpeed = (): void => {
    dependencies.sendPlaybackSpeed(dependencies.getPlaybackSpeed(), message =>
      source._sendMessage(message),
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
      message => source._sendMessage(message),
    );
    source._timelineActive = state.timelineActive;
    source._currentCommitSha = state.currentCommitSha;
    source._gitAnalyzer = nextGitAnalyzer;
  };

  return {
    _indexRepository,
    _jumpToCommit,
    _resetTimeline,
    _openSelectedNode,
    _activateNode,
    _openNodeInEditor,
    _previewFileAtCommit,
    _sendCachedTimeline,
    sendPlaybackSpeed,
    invalidateTimelineCache,
  };
}
