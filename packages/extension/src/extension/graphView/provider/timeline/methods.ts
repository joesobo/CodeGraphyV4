import {
  sendGraphViewProviderCachedTimeline as replayGraphViewProviderCachedTimeline,
} from './cache';
import { invalidateGraphViewProviderTimelineCache } from './invalidate';
import type {
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethods,
  GraphViewProviderTimelineMethodsSource,
} from './contracts';
import { createDefaultGraphViewProviderTimelineMethodDependencies } from './defaultDependencies';
import { createGraphViewProviderTimelineEditorMethods } from './editor';

export type {
  EditorOpenBehavior,
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethods,
  GraphViewProviderTimelineMethodsSource,
} from './contracts';

export function createGraphViewProviderTimelineMethods(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: GraphViewProviderTimelineMethodDependencies =
    createDefaultGraphViewProviderTimelineMethodDependencies(),
): GraphViewProviderTimelineMethods {
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

  const editorMethods = createGraphViewProviderTimelineEditorMethods(source, dependencies);

  return {
    _indexRepository,
    _jumpToCommit,
    _resetTimeline,
    _openSelectedNode: nodeId => editorMethods._openSelectedNode(nodeId),
    _activateNode: nodeId => editorMethods._activateNode(nodeId),
    _openNodeInEditor: (nodeId, behavior) => editorMethods._openNodeInEditor(nodeId, behavior),
    _previewFileAtCommit: (sha, filePath, behavior) =>
      editorMethods._previewFileAtCommit(sha, filePath, behavior),
    _sendCachedTimeline,
    sendPlaybackSpeed,
    invalidateTimelineCache,
  };
}
