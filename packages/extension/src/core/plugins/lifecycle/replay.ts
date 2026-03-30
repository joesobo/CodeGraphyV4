/**
 * @fileoverview Readiness replay for late-registered plugins.
 * @module core/plugins/lifecycle/replay
 */

import type { IGraphData } from '../../../shared/graph/types';
import type { ILifecyclePluginInfo } from './contracts';
import { notifyWorkspaceReadyForPlugin, notifyWebviewReadyForPlugin } from './notify';

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
