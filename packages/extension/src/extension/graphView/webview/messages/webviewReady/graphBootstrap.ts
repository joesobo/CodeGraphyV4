import type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './contracts';
import { replayWebviewReadySettings } from './settingsReplay';

interface ReplayWebviewReadyGraphBootstrapOptions {
  includeGraphData?: boolean;
}

export function replayWebviewReadyBootstrap(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettings(state, handlers);
  replayWebviewReadyGraphBootstrap(handlers);
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
