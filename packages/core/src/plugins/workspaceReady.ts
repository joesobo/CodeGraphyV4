import type { IGraphData } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';

export function notifyWorkspaceReady(
  plugins: Map<string, CorePluginInfo>,
  graph: IGraphData,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    if (!info.plugin.onWorkspaceReady) {
      continue;
    }

    try {
      info.plugin.onWorkspaceReady(graph);
    } catch (error) {
      console.error(`[CodeGraphy] Error in onWorkspaceReady for ${info.plugin.id}:`, error);
    }
  }
}
