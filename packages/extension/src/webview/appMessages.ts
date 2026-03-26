import { IGraphData } from '../shared/contracts';
export type { PluginWebviewModule, PluginInjectPayload, PluginScopedMessage } from './pluginMessageParser';
export {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
  resolvePluginModuleActivator,
} from './pluginMessageParser';

export function getNoDataHint(
  graphData: IGraphData | null,
  showOrphans: boolean,
): string {
  return graphData && !showOrphans
    ? 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.'
    : 'Open a folder to visualize its structure.';
}
