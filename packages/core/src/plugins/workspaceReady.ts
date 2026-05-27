import type { IGraphData } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';

export function notifyWorkspaceReady(
  plugins: Map<string, CorePluginInfo>,
  graph: IGraphData,
): void {
  for (const info of plugins.values()) {
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
