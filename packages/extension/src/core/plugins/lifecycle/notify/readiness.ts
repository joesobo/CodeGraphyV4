import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ILifecyclePluginInfo } from '../contracts';

function logLifecycleError(hook: string, pluginId: string, error: unknown): void {
  console.error(`[CodeGraphy] Error in ${hook} for ${pluginId}:`, error);
}

export function notifyWorkspaceReadyForPlugin(
  info: ILifecyclePluginInfo,
  graph: IGraphData,
): void {
  if (!info.plugin.onWorkspaceReady) {
    return;
  }

  try {
    info.plugin.onWorkspaceReady(graph);
  } catch (error) {
    logLifecycleError('onWorkspaceReady', info.plugin.id, error);
  }
}

export function notifyWorkspaceReady(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    notifyWorkspaceReadyForPlugin(info, graph);
  }
}
