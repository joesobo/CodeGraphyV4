import type { IPluginStatus } from '../../shared/plugins/status';

export function shouldRebuildGraphView(
  pluginStatuses: readonly IPluginStatus[],
  id: string
): boolean {
  const plugin = pluginStatuses.find((status) => status.id === id);
  return (plugin?.connectionCount ?? 0) > 0;
}
