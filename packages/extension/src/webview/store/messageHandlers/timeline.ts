import type { PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';

export function handleIndexProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'INDEX_PROGRESS' }>,
): PartialState {
  return { isIndexing: true, indexProgress: message.payload };
}

export function handleTimelineData(
  message: Extract<ExtensionToWebviewMessage, { type: 'TIMELINE_DATA' }>,
): PartialState {
  return {
    isIndexing: false,
    indexProgress: null,
    timelineActive: true,
    timelineCommits: message.payload.commits,
    currentCommitSha: message.payload.currentSha,
  };
}

export function handleCommitGraphData(
  message: Extract<ExtensionToWebviewMessage, { type: 'COMMIT_GRAPH_DATA' }>,
): PartialState {
  return {
    currentCommitSha: message.payload.sha,
    graphData: message.payload.graphData,
    isLoading: false,
  };
}

export function handlePlaybackSpeedUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLAYBACK_SPEED_UPDATED' }>,
): PartialState {
  return { playbackSpeed: message.payload.speed };
}

export function handleCacheInvalidated(): PartialState {
  return {
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isPlaying: false,
    isIndexing: false,
    indexProgress: null,
  };
}

export function handlePlaybackEnded(): PartialState {
  return { isPlaying: false };
}
