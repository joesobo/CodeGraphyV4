import { IGraphData } from '../../shared/contracts';
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
): string {
  return graphData && !showOrphans
    ? 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.'
    : 'Open a folder to visualize its structure.';
}
