import type { EdgeDecoration, NodeDecoration } from '../../../../core/plugins/decoration/manager';
import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../shared/plugins/decorations';
import type { IPluginExporterItem } from '../../../../shared/plugins/exporters';

interface IContextMenuContribution {
  label: string;
  when: 'node' | 'edge' | 'both';
  icon?: string;
  group?: string;
}

interface IPluginApiWithContextMenu {
  readonly contextMenuItems: readonly IContextMenuContribution[];
}

interface IExporterContribution {
  id: string;
  label: string;
  description?: string;
  group?: string;
}

interface IPluginApiWithExporters {
  readonly exporters: readonly IExporterContribution[];
}

interface IPluginWebviewContributions {
  scripts?: string[];
  styles?: string[];
}

interface IGraphViewPluginInfo {
  plugin: {
    id: string;
    name?: string;
    webviewContributions?: IPluginWebviewContributions;
  };
}

export interface IGraphViewDecorationPayload {
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
}

export interface IGraphViewInjectionPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export function buildGraphViewDecorationPayload(
  nodeDecorations: Iterable<[string, NodeDecoration]>,
  edgeDecorations: Iterable<[string, EdgeDecoration]>
): IGraphViewDecorationPayload {
  const serializedNodeDecorations: Record<string, NodeDecorationPayload> = {};
  for (const [id, decoration] of nodeDecorations) {
    const { priority, ...payload } = decoration;
    void priority;
    serializedNodeDecorations[id] = payload;
  }

  const serializedEdgeDecorations: Record<string, EdgeDecorationPayload> = {};
  for (const [id, decoration] of edgeDecorations) {
    const { priority, ...payload } = decoration;
    void priority;
    serializedEdgeDecorations[id] = payload;
  }

  return {
    nodeDecorations: serializedNodeDecorations,
    edgeDecorations: serializedEdgeDecorations,
  };
}

export function collectGraphViewContextMenuItems(
  pluginInfos: readonly IGraphViewPluginInfo[],
  getPluginApi: (pluginId: string) => IPluginApiWithContextMenu | undefined
): IPluginContextMenuItem[] {
  const items: IPluginContextMenuItem[] = [];

  for (const pluginInfo of pluginInfos) {
    const api = getPluginApi(pluginInfo.plugin.id);
    if (!api) continue;

    for (let index = 0; index < api.contextMenuItems.length; index++) {
      const item = api.contextMenuItems[index];
      items.push({
        label: item.label,
        when: item.when,
        icon: item.icon,
        group: item.group,
        pluginId: pluginInfo.plugin.id,
        index,
      });
    }
  }

  return items;
}

export function collectGraphViewExporters(
  pluginInfos: readonly IGraphViewPluginInfo[],
  getPluginApi: (pluginId: string) => IPluginApiWithExporters | undefined,
): IPluginExporterItem[] {
  const items: IPluginExporterItem[] = [];

  for (const pluginInfo of pluginInfos) {
    const api = getPluginApi(pluginInfo.plugin.id);
    if (!api) continue;

    for (let index = 0; index < api.exporters.length; index += 1) {
      const exporter = api.exporters[index];
      items.push({
        id: exporter.id,
        label: exporter.label,
        description: exporter.description,
        group: exporter.group,
        pluginId: pluginInfo.plugin.id,
        pluginName: pluginInfo.plugin.name ?? pluginInfo.plugin.id,
        index,
      });
    }
  }

  return items;
}

export function collectGraphViewWebviewInjections(
  pluginInfos: readonly IGraphViewPluginInfo[],
  resolveAssetPath: (assetPath: string, pluginId?: string) => string
): IGraphViewInjectionPayload[] {
  const injections: IGraphViewInjectionPayload[] = [];

  for (const pluginInfo of pluginInfos) {
    const contributions = pluginInfo.plugin.webviewContributions;
    if (!contributions) continue;

    const scripts = (contributions.scripts ?? []).map((assetPath) =>
      resolveAssetPath(assetPath, pluginInfo.plugin.id)
    );
    const styles = (contributions.styles ?? []).map((assetPath) =>
      resolveAssetPath(assetPath, pluginInfo.plugin.id)
    );

    if (scripts.length === 0 && styles.length === 0) continue;

    injections.push({
      pluginId: pluginInfo.plugin.id,
      scripts,
      styles,
    });
  }

  return injections;
}
