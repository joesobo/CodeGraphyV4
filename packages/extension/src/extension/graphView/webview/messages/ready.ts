import { applyWebviewReady as applyWebviewReadyImpl } from './webviewReady/apply';
import type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './webviewReady/contracts';
import {
  replayDuplicateWebviewReady as replayDuplicateWebviewReadyImpl,
  replayWebviewReadyBootstrap as replayWebviewReadyBootstrapImpl,
  replayWebviewReadyGraphBootstrap as replayWebviewReadyGraphBootstrapImpl,
  shouldWaitForFirstWorkspaceGraph as shouldWaitForFirstWorkspaceGraphImpl,
} from './webviewReady/graphBootstrap';
import { replayWebviewReadySettings as replayWebviewReadySettingsImpl } from './webviewReady/settingsReplay';

export type {
  GraphViewReadyHandlers,
  GraphViewReadyState,
} from './webviewReady/contracts';

export function replayWebviewReadySettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettingsImpl(state, handlers);
}

export function replayWebviewReadyBootstrap(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadyBootstrapImpl(state, handlers);
}

export function replayWebviewReadyGraphBootstrap(
  handlers: Pick<GraphViewReadyHandlers, 'getGraphData' | 'sendMessage'>,
  options: { includeGraphData?: boolean } = {},
): void {
  replayWebviewReadyGraphBootstrapImpl(handlers, options);
}

export function shouldWaitForFirstWorkspaceGraph(state: GraphViewReadyState): boolean {
  return shouldWaitForFirstWorkspaceGraphImpl(state);
}

export function replayDuplicateWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<void> {
  return replayDuplicateWebviewReadyImpl(state, handlers);
}

export function applyWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<boolean> {
  return applyWebviewReadyImpl(state, handlers);
}
