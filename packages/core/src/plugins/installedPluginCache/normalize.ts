import type {
  CodeGraphyInstalledPluginCache,
  CodeGraphyInstalledPluginRecord,
} from './contracts';
import { normalizeInstalledPluginRecord } from './record';
import { isRecord } from './values';

function createEmptyInstalledPluginCache(): CodeGraphyInstalledPluginCache {
  return {
    version: 1,
    plugins: [],
  };
}

export function normalizeInstalledPluginCache(value: unknown): CodeGraphyInstalledPluginCache {
  if (!isRecord(value) || !Array.isArray(value.plugins)) {
    return createEmptyInstalledPluginCache();
  }

  return {
    version: 1,
    plugins: value.plugins
      .map(normalizeInstalledPluginRecord)
      .filter((entry): entry is CodeGraphyInstalledPluginRecord => entry !== null),
  };
}
