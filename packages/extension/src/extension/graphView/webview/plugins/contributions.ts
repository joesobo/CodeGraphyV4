import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { IPluginExporterItem } from '../../../../shared/plugins/exporters';
import type { IPluginToolbarAction } from '../../../../shared/plugins/toolbarActions';

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

interface IToolbarActionItemContribution {
  id: string;
  label: string;
  description?: string;
}

interface IToolbarActionContribution {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  items: readonly IToolbarActionItemContribution[];
}

interface IPluginApiWithToolbarActions {
  readonly toolbarActions: readonly IToolbarActionContribution[];
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

export interface IGraphViewInjectionPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export function collectGraphViewContextMenuItems(
  pluginInfos: readonly IGraphViewPluginInfo[],
  getPluginApi: (pluginId: string) => IPluginApiWithContextMenu | undefined,
): IPluginContextMenuItem[] {
  return pluginInfos.flatMap((pluginInfo) => {
    return getPluginApi(pluginInfo.plugin.id)?.contextMenuItems.map((item, index) => ({
      label: item.label,
      when: item.when,
      icon: item.icon,
      group: item.group,
      pluginId: pluginInfo.plugin.id,
      index,
    })) ?? [];
  });
}

export function collectGraphViewExporters(
  pluginInfos: readonly IGraphViewPluginInfo[],
  getPluginApi: (pluginId: string) => IPluginApiWithExporters | undefined,
): IPluginExporterItem[] {
  return pluginInfos.flatMap((pluginInfo) => {
    return getPluginApi(pluginInfo.plugin.id)?.exporters.map((exporter, index) => ({
      id: exporter.id,
      label: exporter.label,
      description: exporter.description,
      group: exporter.group,
      pluginId: pluginInfo.plugin.id,
      pluginName: pluginInfo.plugin.name ?? pluginInfo.plugin.id,
      index,
    })) ?? [];
  });
}

export function collectGraphViewToolbarActions(
  pluginInfos: readonly IGraphViewPluginInfo[],
  getPluginApi: (pluginId: string) => IPluginApiWithToolbarActions | undefined,
): IPluginToolbarAction[] {
  return pluginInfos.flatMap((pluginInfo) => {
    return getPluginApi(pluginInfo.plugin.id)?.toolbarActions.map((action, index) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      description: action.description,
      pluginId: pluginInfo.plugin.id,
      pluginName: pluginInfo.plugin.name ?? pluginInfo.plugin.id,
      index,
      items: action.items.map((item, itemIndex) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        index: itemIndex,
      })),
    })) ?? [];
  });
}

export function collectGraphViewWebviewInjections(
  pluginInfos: readonly IGraphViewPluginInfo[],
  resolveAssetPath: (assetPath: string, pluginId?: string) => string,
): IGraphViewInjectionPayload[] {
  return pluginInfos.flatMap((pluginInfo) => {
    const contributions = pluginInfo.plugin.webviewContributions;
    if (!contributions) return [];

    const scripts = (contributions.scripts ?? []).map((assetPath) =>
      resolveAssetPath(assetPath, pluginInfo.plugin.id),
    );
    const styles = (contributions.styles ?? []).map((assetPath) =>
      resolveAssetPath(assetPath, pluginInfo.plugin.id),
    );

    if (scripts.length === 0 && styles.length === 0) return [];

    return [{
      pluginId: pluginInfo.plugin.id,
      scripts,
      styles,
    }];
  });
}
