import type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './contracts';
import { emitWebviewBootstrapCompleted } from './diagnostics';
import {
  replayWebviewReadyHydrationSettings,
  replayWebviewReadySettings,
} from './settingsReplay';

export async function applyWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<boolean> {
  replayWebviewReadySettings(state, handlers);

  await handlers.loadAndSendData();
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
