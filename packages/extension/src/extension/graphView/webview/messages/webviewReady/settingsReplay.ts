import type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './contracts';
import { emitWebviewReadyReplayed } from './diagnostics';
import { sendWebviewReadyFilterPatterns } from './filterPatterns';

interface ReplayWebviewReadySettingsMessagesOptions {
  includeFilterPatterns: boolean;
  includePluginBootstrap: boolean;
}

export function replayWebviewReadySettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  emitWebviewReadyReplayed(state);
  replayWebviewReadySettingsMessages(state, handlers, {
    includeFilterPatterns: true,
    includePluginBootstrap: true,
  });
}

export function replayWebviewReadyHydrationSettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettingsMessages(state, handlers, {
    includeFilterPatterns: true,
    includePluginBootstrap: false,
  });
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
  sendWebviewReadySettingValues(state, handlers);
  handlers.sendDecorations();
  if (options.includePluginBootstrap) {
    handlers.sendPluginWebviewInjections();
  }
  handlers.sendActiveFile();
}

function sendWebviewReadySettingValues(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  handlers.sendMessage({
    type: 'MAX_FILES_UPDATED',
    payload: { maxFiles: state.maxFiles },
  });
  handlers.sendMessage({
    type: 'SHOW_FPS_UPDATED',
    payload: { showFps: state.showFps ?? false },
  });
  handlers.sendMessage({
    type: 'VERBOSE_DIAGNOSTICS_UPDATED',
    payload: { verboseDiagnostics: state.verboseDiagnostics },
  });
  handlers.sendMessage({
    type: 'DEPTH_MODE_UPDATED',
    payload: { depthMode: state.depthMode ?? false },
  });
  handlers.sendMessage({
    type: 'NODE_SIZE_MODE_UPDATED',
    payload: { nodeSizeMode: state.nodeSizeMode },
  });
}
