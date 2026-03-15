import * as vscode from 'vscode';
import type { IGroup } from '../../shared/types';

export const GRAPH_VIEW_BUILT_IN_PLUGIN_DIRS: Record<string, string> = {
  'codegraphy.typescript': 'plugin-typescript',
  'codegraphy.gdscript': 'plugin-godot',
  'codegraphy.python': 'plugin-python',
  'codegraphy.csharp': 'plugin-csharp',
  'codegraphy.markdown': 'plugin-markdown',
};

const GRAPH_VIEW_BUILT_IN_DEFAULT_GROUPS: Array<{ pattern: string; color: string }> = [
  { pattern: '.gitignore', color: '#F97583' },
  { pattern: '*.json', color: '#F9C74F' },
  { pattern: '*.png', color: '#90BE6D' },
  { pattern: '*.jpg', color: '#90BE6D' },
  { pattern: '*.svg', color: '#43AA8B' },
  { pattern: '*.md', color: '#577590' },
  { pattern: '*.jpeg', color: '#90BE6D' },
  { pattern: '.vscode/settings.json', color: '#277ACC' },
];

export function registerBuiltInGraphViewPluginRoots(
  extensionUri: vscode.Uri,
  pluginExtensionUris: Map<string, vscode.Uri>,
): void {
  for (const [pluginId, dirName] of Object.entries(GRAPH_VIEW_BUILT_IN_PLUGIN_DIRS)) {
    if (!pluginExtensionUris.has(pluginId)) {
      pluginExtensionUris.set(
        pluginId,
        vscode.Uri.joinPath(extensionUri, 'packages', dirName),
      );
    }
  }
}

export function getBuiltInGraphViewDefaultGroups(): IGroup[] {
  return GRAPH_VIEW_BUILT_IN_DEFAULT_GROUPS.map(({ pattern, color }) => ({
    id: `default:${pattern}`,
    pattern,
    color,
    isPluginDefault: true,
    pluginName: 'CodeGraphy',
  }));
}
