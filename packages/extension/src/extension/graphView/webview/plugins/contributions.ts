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
