import * as vscode from 'vscode';

function getBuiltInGraphViewPluginDirEntries(): Array<readonly [string, string]> {
  return [
    ['codegraphy.godot', 'plugin-godot'],
    ['codegraphy.markdown', 'plugin-markdown'],
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
