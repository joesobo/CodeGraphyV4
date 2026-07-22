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
  assets?: IPluginWebviewAssetContribution[];
}

interface IPluginWebviewAssetContribution {
  id: string;
  label: string;
  path: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export interface IGraphViewWebviewAsset {
  id: string;
  label: string;
  path: string;
  url: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

interface IGraphViewPluginInfo {
  descriptorSignature?: string;
  plugin: {
    id: string;
    name?: string;
    webviewContributions?: IPluginWebviewContributions;
  };
}

export interface IGraphViewInjectionPayload {
  pluginId: string;
  revision?: string;
  scripts: string[];
  styles: string[];
  assets: IGraphViewWebviewAsset[];
}

function addPluginRevision(assetUrl: string, revision: string | undefined): string {
  if (!revision) return assetUrl;

  const fragmentIndex = assetUrl.indexOf('#');
  const baseUrl = fragmentIndex >= 0 ? assetUrl.slice(0, fragmentIndex) : assetUrl;
  const fragment = fragmentIndex >= 0 ? assetUrl.slice(fragmentIndex) : '';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}codegraphyPluginRevision=${encodeURIComponent(revision)}${fragment}`;
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
    if (!contributions && !pluginInfo.descriptorSignature) return [];
    const resolveVersionedAssetPath = (assetPath: string): string => addPluginRevision(
      resolveAssetPath(assetPath, pluginInfo.plugin.id),
      pluginInfo.descriptorSignature,
    );

    const scripts = (contributions?.scripts ?? []).map(resolveVersionedAssetPath);
    const styles = (contributions?.styles ?? []).map(resolveVersionedAssetPath);
    const assets = (contributions?.assets ?? []).map((asset) => ({
      ...asset,
      url: resolveVersionedAssetPath(asset.path),
    }));

    if (
      !pluginInfo.descriptorSignature
      && scripts.length === 0
      && styles.length === 0
      && assets.length === 0
    ) return [];

    return [{
      pluginId: pluginInfo.plugin.id,
      ...(pluginInfo.descriptorSignature ? { revision: pluginInfo.descriptorSignature } : {}),
      scripts,
      styles,
      assets,
    }];
  });
}
