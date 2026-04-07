import * as vscode from 'vscode';
import {
  createPermanentNodeOpenBehavior,
  createTemporaryNodeOpenBehavior,
} from './behavior';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  resetGraphViewProviderTimeline,
} from '../../timeline/provider/indexing';
import {
  invalidateGraphViewProviderTimelineCache,
  sendGraphViewProviderCachedTimeline as replayGraphViewProviderCachedTimeline,
} from './cache';
import {
  invalidateGraphViewTimelineCache,
  sendCachedGraphViewTimeline,
  sendGraphViewPlaybackSpeed,
} from '../../timeline/playback';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from '../../timeline/open';
import type {
  EditorOpenBehavior,
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethods,
  GraphViewProviderTimelineMethodsSource,
} from './types';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';

export type {
  EditorOpenBehavior,
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethods,
  GraphViewProviderTimelineMethodsSource,
} from './types';

function createDefaultDependencies(): GraphViewProviderTimelineMethodDependencies {
  return {
    indexRepository: indexGraphViewProviderRepository,
    jumpToCommit: jumpGraphViewProviderToCommit,
    resetTimeline: resetGraphViewProviderTimeline,
    openNodeInEditor: openGraphViewNodeInEditor,
    previewFileAtCommit: previewGraphViewFileAtCommit,
    sendCachedTimeline: sendCachedGraphViewTimeline,
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
    behavior: EditorOpenBehavior = {
      preview: true,
      preserveFocus: false,
    },
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
    await replayGraphViewProviderCachedTimeline(source, dependencies);
  };

  const sendPlaybackSpeed = (): void => {
    dependencies.sendPlaybackSpeed(dependencies.getPlaybackSpeed(), message =>
      source._sendMessage(message),
    );
  };

  const invalidateTimelineCache = async (): Promise<void> => {
    await invalidateGraphViewProviderTimelineCache(source, dependencies);
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
