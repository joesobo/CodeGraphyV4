import type { ICodeGraphyRepoSettings } from '../../defaults';
import { deepClone, isPlainObject } from '../model/plainObject';

export function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const persisted = deepClone(value) as unknown as Record<string, unknown>;

  const nodeColors = isPlainObject(persisted.nodeColors)
    ? { ...persisted.nodeColors }
    : {};
  if (typeof persisted.folderNodeColor === 'string' && !('folder' in nodeColors)) {
    nodeColors.folder = persisted.folderNodeColor;
  }
  persisted.nodeColors = nodeColors;
  if (Array.isArray(persisted.legend)) {
    persisted.legend = persisted.legend
      .filter(isPlainObject)
      .map((rule) => {
        const serializedRule = { ...rule };
        delete serializedRule.id;
        delete serializedRule.imageUrl;
        delete serializedRule.isPluginDefault;
        delete serializedRule.pluginName;
        return serializedRule;
      });
  }

  delete persisted.plugins;
  delete persisted.folderNodeColor;
  delete persisted.exclude;

  return `${JSON.stringify(persisted, null, 2)}\n`;
}
