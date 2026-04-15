import type { ICodeGraphyRepoSettings } from './defaults';
import { deepClone, isPlainObject } from './storeObjects';

export function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const persisted = deepClone(value) as unknown as Record<string, unknown>;

  const nodeColors = isPlainObject(persisted.nodeColors)
    ? { ...persisted.nodeColors }
    : {};
  if (typeof persisted.folderNodeColor === 'string' && !('folder' in nodeColors)) {
    nodeColors.folder = persisted.folderNodeColor;
  }
  persisted.nodeColors = nodeColors;
  delete persisted.folderNodeColor;
  delete persisted.exclude;

  return `${JSON.stringify(persisted, null, 2)}\n`;
}
