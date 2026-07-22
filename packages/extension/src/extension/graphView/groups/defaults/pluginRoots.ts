import * as vscode from 'vscode';

interface PackagePluginRootInfo {
  plugin: {
    id: string;
  };
  sourcePackageRoot?: string;
}

interface PackagePluginRootRegistry {
  extensionPlugins?: {
    list(): PackagePluginRootInfo[];
  };
  list(): PackagePluginRootInfo[];
}

interface PackagePluginRootAnalyzer {
  registry: PackagePluginRootRegistry;
}

function getBuiltInGraphViewPluginDirEntries(): Array<readonly [string, string]> {
  return [
    ['codegraphy.godot', 'plugin-godot'],
    ['codegraphy.unity', 'plugin-unity'],
  ];
}

export function getBuiltInGraphViewPluginDir(pluginId: string): string | undefined {
  return getBuiltInGraphViewPluginDirEntries().find(([id]) => id === pluginId)?.[1];
}

export function registerBuiltInGraphViewPluginRoots(
  extensionUri: vscode.Uri,
  pluginExtensionUris: Map<string, vscode.Uri>,
): void {
  for (const [pluginId, dirName] of getBuiltInGraphViewPluginDirEntries()) {
    if (!pluginExtensionUris.has(pluginId)) {
      pluginExtensionUris.set(
        pluginId,
        vscode.Uri.joinPath(extensionUri, 'packages', dirName),
      );
    }
  }
}

export function registerPackageGraphViewPluginRoots(
  analyzer: PackagePluginRootAnalyzer | undefined,
  pluginExtensionUris: Map<string, vscode.Uri>,
): void {
  const pluginInfos = analyzer
    ? [...analyzer.registry.list(), ...(analyzer.registry.extensionPlugins?.list() ?? [])]
    : [];
  for (const pluginInfo of pluginInfos) {
    if (!pluginInfo.sourcePackageRoot || pluginExtensionUris.has(pluginInfo.plugin.id)) {
      continue;
    }

    pluginExtensionUris.set(
      pluginInfo.plugin.id,
      vscode.Uri.file(pluginInfo.sourcePackageRoot),
    );
  }
}
