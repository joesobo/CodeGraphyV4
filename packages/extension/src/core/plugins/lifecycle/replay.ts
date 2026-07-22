/**
 * @fileoverview Readiness replay for late-registered plugins.
 * @module core/plugins/lifecycle/replay
 */

import type { IGraphData } from '../../../shared/graph/contracts';
import type { ILifecyclePluginInfo } from './contracts';
import { notifyWorkspaceReadyForPlugin } from './notify/readiness';

/**
 * Replays readiness hooks for a late-registered plugin.
 */
export function replayReadinessForPlugin(
  info: ILifecyclePluginInfo,
  workspaceReadyNotified: boolean,
  lastWorkspaceReadyGraph: IGraphData | undefined,
): void {
  if (workspaceReadyNotified && lastWorkspaceReadyGraph) {
    notifyWorkspaceReadyForPlugin(info, lastWorkspaceReadyGraph);
  }
}
