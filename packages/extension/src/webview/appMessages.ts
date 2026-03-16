import { IGraphData } from '../shared/types';
export type { PluginWebviewModule, PluginInjectPayload, PluginScopedMessage } from './lib/pluginMessageParser';
export {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
  resolvePluginModuleActivator,
} from './lib/pluginMessageParser';

export function getNoDataHint(
  graphData: IGraphData | null,
  showOrphans: boolean,
): string {
  return graphData && !showOrphans
    ? 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.'
    : 'Open a folder to visualize its structure.';
}
