import type { IPluginStatus } from '../../../shared/plugins/status';

function rowKey(plugin: IPluginStatus): string {
  return plugin.id;
}

function rowPriority(plugin: IPluginStatus): number {
  const activePriority = plugin.status === 'active' ? 2 : 0;
  const namedPriority = plugin.name !== plugin.packageName ? 1 : 0;
  return activePriority + namedPriority;
}

export function dedupePluginStatuses(plugins: readonly IPluginStatus[]): IPluginStatus[] {
  const rows = new Map<string, IPluginStatus>();
  for (const plugin of plugins) {
    const key = rowKey(plugin);
    const current = rows.get(key);
    if (!current || rowPriority(plugin) >= rowPriority(current)) rows.set(key, plugin);
  }
  return Array.from(rows.values());
}
