/**
 * @fileoverview Readiness replay for late-registered plugins.
 * @module core/plugins/lifecycleReplay
 */

import type { IGraphData } from '../../shared/contracts';
import type { ILifecyclePluginInfo } from './lifecycleTypes';
import { notifyWorkspaceReadyForPlugin, notifyWebviewReadyForPlugin } from './lifecycleNotify';

/**
 * Replays readiness hooks for a late-registered plugin.
 */
export function replayReadinessForPlugin(
  info: ILifecyclePluginInfo,
  workspaceReadyNotified: boolean,
  lastWorkspaceReadyGraph: IGraphData | undefined,
  webviewReadyNotified: boolean,
): void {
  if (workspaceReadyNotified && lastWorkspaceReadyGraph) {
    notifyWorkspaceReadyForPlugin(info, lastWorkspaceReadyGraph);
  }
  if (webviewReadyNotified) {
    notifyWebviewReadyForPlugin(info);
  }
}
