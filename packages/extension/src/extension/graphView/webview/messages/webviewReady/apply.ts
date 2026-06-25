import type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './contracts';
import { emitWebviewBootstrapCompleted } from './diagnostics';
import { areWebviewReadyFilterPatternsEqual } from './filterPatternEquality';
import {
  createWebviewReadyFilterPatternsPayload,
} from './filterPatterns';
import {
  replayWebviewReadyHydrationSettings,
  replayWebviewReadySettings,
} from './settingsReplay';

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
  emitWebviewBootstrapCompleted(state);

  if (state.readyNotified) {
    return true;
  }

  handlers.notifyWebviewReady();
  return true;
}

function shouldReplayHydrationSettingsAfterLoad(state: GraphViewReadyState): boolean {
  return state.hasWorkspace && state.firstAnalysis;
}
