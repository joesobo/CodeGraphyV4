import type { IGraphData } from '../../../shared/graph/contracts';
export type { PluginWebviewModule } from '../../pluginRuntime/moduleResolver';
export type { PluginInjectPayload, PluginScopedMessage } from '../../pluginRuntime/messageValidation';
export {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
} from '../../pluginRuntime/messageValidation';
export { resolvePluginModuleActivator } from '../../pluginRuntime/moduleResolver';

export function getNoDataHint(
  graphData: IGraphData | null,
  showOrphans: boolean,
  depthMode = false,
  timelineActive = false,
): string {
  if (graphData && !showOrphans) {
    return 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.';
  }

  if (graphData && depthMode) {
    return 'No nodes match the current depth focus. Try changing the focused file or disabling depth mode.';
  }

  if (graphData && timelineActive) {
    return 'No graphable files exist in this commit. Try another point in the timeline.';
  }

  return 'Open a folder to visualize its structure.';
}
