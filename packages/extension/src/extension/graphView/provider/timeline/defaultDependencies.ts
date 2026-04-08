import * as vscode from 'vscode';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  resetGraphViewProviderTimeline,
} from '../../timeline/provider/indexing';
import {
  invalidateGraphViewTimelineCache,
  sendCachedGraphViewTimeline,
  sendGraphViewPlaybackSpeed,
} from '../../timeline/playback';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from '../../timeline/open';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { GraphViewProviderTimelineMethodDependencies } from './types';

export function createDefaultGraphViewProviderTimelineMethodDependencies(): GraphViewProviderTimelineMethodDependencies {
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
