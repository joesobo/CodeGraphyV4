import type { IGraphData } from '../../shared/graph/types';
export type { PluginWebviewModule } from '../pluginRuntime/moduleResolver';
export type { PluginInjectPayload, PluginScopedMessage } from '../pluginRuntime/messageValidation';
export {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
} from '../pluginRuntime/messageValidation';
export { resolvePluginModuleActivator } from '../pluginRuntime/moduleResolver';

export function getNoDataHint(
  graphData: IGraphData | null,
  showOrphans: boolean,
  activeViewId = 'codegraphy.connections',
): string {
  if (graphData && !showOrphans) {
    return 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.';
  }

  if (graphData && activeViewId !== 'codegraphy.connections') {
    return 'No nodes match the current view. Try switching views or changing the focused file.';
  }

  return 'Open a folder to visualize its structure.';
}
