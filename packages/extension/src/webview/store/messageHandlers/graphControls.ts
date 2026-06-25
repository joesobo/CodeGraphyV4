import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IHandlerContext, PartialState } from '../messageTypes';
import { createGraphControlsStatePatch } from './graphControls/patch';

export function handleGraphIndexStatusUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_STATUS_UPDATED' }>,
): PartialState {
  const indexIsReady = message.payload.hasIndex && message.payload.freshness === 'fresh';

  return {
    graphHasIndex: message.payload.hasIndex,
    graphIndexFreshness: message.payload.freshness,
    graphIndexDetail: message.payload.detail,
    ...(indexIsReady ? {
      graphIsIndexing: false,
      graphIndexProgress: null,
    } : {}),
  };
}

export function handleGraphIndexProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_PROGRESS' }>,
): PartialState {
  return {
    graphIsIndexing: true,
    graphIndexProgress: message.payload,
  };
}

export function handleGraphControlsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }>,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (!state) {
    return {
      graphNodeTypes: message.payload.nodeTypes,
      graphEdgeTypes: message.payload.edgeTypes,
      nodeColors: message.payload.nodeColors,
      nodeVisibility: message.payload.nodeVisibility,
      edgeVisibility: message.payload.edgeVisibility,
    };
  }

  const next = createGraphControlsStatePatch(state, message.payload);

  return Object.keys(next).length > 0 ? next : undefined;
}

export function handleSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>,
): PartialState {
  return {
    bidirectionalMode: message.payload.bidirectionalEdges,
    showOrphans: message.payload.showOrphans,
  };
}

export function handleDepthModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_MODE_UPDATED' }>,
): PartialState {
  return { depthMode: message.payload.depthMode };
}

export function handlePhysicsSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PHYSICS_SETTINGS_UPDATED' }>,
): PartialState {
  return { physicsSettings: message.payload };
}

export function handleDepthLimitUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_UPDATED' }>,
): PartialState {
  return { depthLimit: message.payload.depthLimit };
}

export function handleDepthLimitRangeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_RANGE_UPDATED' }>,
): PartialState {
  return { maxDepthLimit: message.payload.maxDepthLimit };
}

export function handleDirectionSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>,
): PartialState {
  return {
    directionMode: message.payload.directionMode,
    directionColor: message.payload.directionColor,
    particleSpeed: message.payload.particleSpeed,
    particleSize: message.payload.particleSize,
  };
}

export function handleShowLabelsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>,
): PartialState {
  return { showLabels: message.payload.showLabels };
}

export function handleMaxFilesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'MAX_FILES_UPDATED' }>,
): PartialState {
  return { maxFiles: message.payload.maxFiles };
}

export function handleVerboseDiagnosticsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'VERBOSE_DIAGNOSTICS_UPDATED' }>,
): PartialState {
  return { verboseDiagnostics: message.payload.verboseDiagnostics };
}

export function handleActiveFileUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'ACTIVE_FILE_UPDATED' }>,
): PartialState {
  return { activeFilePath: message.payload.filePath ?? null };
}
