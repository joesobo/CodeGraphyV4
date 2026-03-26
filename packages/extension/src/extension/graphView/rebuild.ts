import type { IPluginStatus } from '../../shared/contracts';

export function shouldRebuildGraphView(
  pluginStatuses: readonly IPluginStatus[],
  kind: 'rule' | 'plugin',
  id: string
): boolean {
  if (kind === 'plugin') {
    const plugin = pluginStatuses.find((status) => status.id === id);
    return (plugin?.connectionCount ?? 0) > 0;
  }

  for (const plugin of pluginStatuses) {
    const rule = plugin.rules.find((status) => status.qualifiedId === id);
    if (rule) {
      return rule.connectionCount > 0;
    }
  }

  return false;
}
