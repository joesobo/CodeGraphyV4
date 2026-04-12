export interface PluginExporterLike {
  id: string;
  label: string;
  pluginId: string;
  pluginName: string;
  index: number;
  group?: string;
}

export interface PluginExporterGroup {
  key: string;
  label: string;
  items: PluginExporterLike[];
}

export function getPluginExporterKey(item: PluginExporterLike): string {
  return `${item.pluginId}:${item.id}:${item.index}`;
}

export function buildPluginExporterGroups(
  pluginExporters: PluginExporterLike[],
): PluginExporterGroup[] {
  const groupsByLabel = new Map<string, PluginExporterGroup>();

  for (const exporter of pluginExporters) {
    const label = exporter.group
      ? `${exporter.pluginName} / ${exporter.group}`
      : exporter.pluginName;
    const existing = groupsByLabel.get(label);
    if (existing) {
      existing.items.push(exporter);
      continue;
    }

    groupsByLabel.set(label, {
      key: label,
      label,
      items: [exporter],
    });
  }

  return [...groupsByLabel.values()];
}
