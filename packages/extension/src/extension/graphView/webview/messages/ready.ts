import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { createExtensionDiagnosticLogger } from '../../../diagnostics/logger';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';

export interface GraphViewReadyState {
  maxFiles: number;
  verboseDiagnostics: boolean;
  playbackSpeed: number;
  depthMode?: boolean;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
  focusedFile: string | undefined;
  hasWorkspace: boolean;
  firstAnalysis: boolean;
  readyNotified: boolean;
}

export interface GraphViewReadyHandlers {
  getGraphData(): IGraphData;
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups?: () => IPluginFilterPatternGroup[];
  getConfig<T>(key: string, defaultValue: T): T;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  sendDepthState(): void;
  sendGraphControls(): void;
  loadAndSendData(): void | Promise<void>;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: { type: string; payload?: unknown }): void;
  sendCachedTimeline(): Promise<void>;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginStatuses?(): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
  sendGraphViewContributionStatuses?(): void;
  sendPluginWebviewInjections(): void;
  sendActiveFile(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
}

type FilterPatternsUpdatedMessage = Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>;
type FilterPatternsPayload = FilterPatternsUpdatedMessage['payload'];

function createWebviewReadyFilterPatternsPayload(handlers: GraphViewReadyHandlers): FilterPatternsPayload {
  return {
    patterns: handlers.getFilterPatterns(),
    pluginPatterns: handlers.getPluginFilterPatterns(),
    pluginPatternGroups: handlers.getPluginFilterGroups?.() ?? [],
    disabledCustomPatterns: handlers.getConfig('disabledCustomFilterPatterns', []),
    disabledPluginPatterns: handlers.getConfig('disabledPluginFilterPatterns', []),
  };
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function arePluginFilterPatternGroupsEqual(
  left: readonly IPluginFilterPatternGroup[],
  right: readonly IPluginFilterPatternGroup[],
): boolean {
  return left.length === right.length && left.every((leftGroup, index) => {
    const rightGroup = right[index];
    return Boolean(rightGroup)
      && leftGroup.pluginId === rightGroup.pluginId
      && leftGroup.pluginName === rightGroup.pluginName
      && areStringArraysEqual(leftGroup.patterns, rightGroup.patterns);
  });
}

function areWebviewReadyFilterPatternsEqual(
  left: FilterPatternsPayload,
  right: FilterPatternsPayload,
): boolean {
  return areStringArraysEqual(left.patterns, right.patterns)
    && areStringArraysEqual(left.pluginPatterns, right.pluginPatterns)
    && arePluginFilterPatternGroupsEqual(left.pluginPatternGroups, right.pluginPatternGroups)
    && areStringArraysEqual(left.disabledCustomPatterns, right.disabledCustomPatterns)
    && areStringArraysEqual(left.disabledPluginPatterns, right.disabledPluginPatterns);
}

function sendWebviewReadyFilterPatterns(handlers: GraphViewReadyHandlers): FilterPatternsPayload {
  const payload = createWebviewReadyFilterPatternsPayload(handlers);
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload,
  });
  return payload;
}

interface ReplayWebviewReadySettingsMessagesOptions {
  includeFilterPatterns: boolean;
  includePluginBootstrap: boolean;
}

function replayWebviewReadySettingsMessages(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
  options: ReplayWebviewReadySettingsMessagesOptions,
): void {
  handlers.loadGroupsAndFilterPatterns();
  handlers.loadDisabledRulesAndPlugins();
  handlers.sendDepthState();
  handlers.sendGraphControls();
  handlers.sendFavorites();
  handlers.sendSettings();
  handlers.sendPhysicsSettings();
  handlers.sendGroupsUpdated();
  if (options.includeFilterPatterns) {
    sendWebviewReadyFilterPatterns(handlers);
  }
  handlers.sendMessage({
    type: 'MAX_FILES_UPDATED',
    payload: { maxFiles: state.maxFiles },
  });
  handlers.sendMessage({
    type: 'VERBOSE_DIAGNOSTICS_UPDATED',
    payload: { verboseDiagnostics: state.verboseDiagnostics },
  });
  handlers.sendMessage({
    type: 'PLAYBACK_SPEED_UPDATED',
    payload: { speed: state.playbackSpeed },
  });
  handlers.sendMessage({
    type: 'DEPTH_MODE_UPDATED',
    payload: { depthMode: state.depthMode ?? false },
  });
  handlers.sendMessage({
    type: 'DAG_MODE_UPDATED',
    payload: { dagMode: state.dagMode },
  });
  handlers.sendMessage({
    type: 'NODE_SIZE_MODE_UPDATED',
    payload: { nodeSizeMode: state.nodeSizeMode },
  });
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  if (options.includePluginBootstrap) {
    handlers.sendGraphViewContributionStatuses?.();
    handlers.sendPluginWebviewInjections();
  }
  handlers.sendActiveFile();
}

export function replayWebviewReadySettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  createExtensionDiagnosticLogger({
    isEnabled: () => state.verboseDiagnostics,
  }).emit({
    area: 'extension.webview',
    event: 'ready-replayed',
    context: {
      hasWorkspace: state.hasWorkspace,
      firstAnalysis: state.firstAnalysis,
      readyNotified: state.readyNotified,
      maxFiles: state.maxFiles,
    },
  });
  replayWebviewReadySettingsMessages(state, handlers, {
    includeFilterPatterns: true,
    includePluginBootstrap: true,
  });
}

function shouldReplayHydrationSettingsAfterLoad(state: GraphViewReadyState): boolean {
  return state.hasWorkspace && state.firstAnalysis;
}

function replayWebviewReadyHydrationSettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettingsMessages(state, handlers, {
    includeFilterPatterns: false,
    includePluginBootstrap: false,
  });
}

export function replayWebviewReadyBootstrap(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettings(state, handlers);
  replayWebviewReadyGraphBootstrap(handlers);
}

interface ReplayWebviewReadyGraphBootstrapOptions {
  includeGraphData?: boolean;
}

export function replayWebviewReadyGraphBootstrap(
  handlers: Pick<GraphViewReadyHandlers, 'getGraphData' | 'sendMessage'>,
  options: ReplayWebviewReadyGraphBootstrapOptions = {},
): void {
  if (options.includeGraphData ?? true) {
    handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: handlers.getGraphData() });
  }
  handlers.sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
}

export function shouldWaitForFirstWorkspaceGraph(state: GraphViewReadyState): boolean {
  return state.hasWorkspace && state.firstAnalysis;
}

export async function replayDuplicateWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<void> {
  if (shouldWaitForFirstWorkspaceGraph(state)) {
    return;
  }

  replayWebviewReadySettings(state, handlers);
  replayWebviewReadyGraphBootstrap(handlers, { includeGraphData: !state.readyNotified });
}

export async function applyWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<boolean> {
  replayWebviewReadySettings(state, handlers);

  const initialFilterPatterns = createWebviewReadyFilterPatternsPayload(handlers);
  await handlers.sendCachedTimeline();
  await handlers.loadAndSendData();
  const loadedFilterPatterns = createWebviewReadyFilterPatternsPayload(handlers);
  if (!areWebviewReadyFilterPatternsEqual(initialFilterPatterns, loadedFilterPatterns)) {
    handlers.sendMessage({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: loadedFilterPatterns,
    });
  }
  handlers.sendPluginStatuses?.();
  if (shouldReplayHydrationSettingsAfterLoad(state)) {
    replayWebviewReadyHydrationSettings(state, handlers);
  }

  handlers.sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
  createExtensionDiagnosticLogger({
    isEnabled: () => state.verboseDiagnostics,
  }).emit({
    area: 'extension.webview',
    event: 'bootstrap-completed',
    context: {
      hasWorkspace: state.hasWorkspace,
      firstAnalysis: state.firstAnalysis,
      readyNotified: state.readyNotified,
    },
  });

  if (state.readyNotified) {
    return true;
  }

  handlers.notifyWebviewReady();
  return true;
}
