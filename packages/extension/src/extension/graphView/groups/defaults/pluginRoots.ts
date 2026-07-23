import * as vscode from 'vscode';

interface PackagePluginRootInfo {
  plugin: {
    id: string;
  };
  sourcePackageRoot?: string;
}

interface PackagePluginRootRegistry {
  extensionPlugins: {
    list(): PackagePluginRootInfo[];
  };
}

interface PackagePluginRootAnalyzer {
  registry: PackagePluginRootRegistry;
}

function getBuiltInGraphViewPluginDirEntries(): Array<readonly [string, string]> {
  return [
    ['codegraphy.godot.extension', 'plugin-godot'],
    ['codegraphy.unity.extension', 'plugin-unity'],
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
  const pluginInfos: PackagePluginRootInfo[] = analyzer
    ? analyzer.registry.extensionPlugins.list()
    : [];
  const packageRoots = new Map<string, vscode.Uri>();
  for (const pluginInfo of pluginInfos) {
    if (!pluginInfo.sourcePackageRoot) {
      continue;
    }

    packageRoots.set(
      pluginInfo.plugin.id,
      vscode.Uri.file(pluginInfo.sourcePackageRoot),
    );
  }

  const builtInPluginIds = new Set(
    getBuiltInGraphViewPluginDirEntries().map(([pluginId]) => pluginId),
  );
  for (const pluginId of pluginExtensionUris.keys()) {
    if (!builtInPluginIds.has(pluginId) && !packageRoots.has(pluginId)) {
      pluginExtensionUris.delete(pluginId);
    }
  }
  for (const [pluginId, root] of packageRoots) {
    pluginExtensionUris.set(pluginId, root);
  }
}
