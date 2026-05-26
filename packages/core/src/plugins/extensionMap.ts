import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { normalizePluginExtension } from './routing/fileExtensions';

export function addPluginToExtensionMap(
  plugin: IPlugin,
  extensionMap: Map<string, string[]>,
): void {
  for (const extension of plugin.supportedExtensions) {
    const normalizedExtension = extension === '*' ? extension : normalizePluginExtension(extension);
    const pluginIds = extensionMap.get(normalizedExtension) ?? [];
    if (!pluginIds.includes(plugin.id)) {
      pluginIds.push(plugin.id);
    }
    extensionMap.set(normalizedExtension, pluginIds);
  }
}
