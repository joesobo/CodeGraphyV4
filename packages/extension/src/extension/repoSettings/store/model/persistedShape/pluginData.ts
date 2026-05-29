import { isPlainObject } from '../plainObject';

export function normalizePersistedPluginData(normalized: Record<string, unknown>): void {
  if ('pluginData' in normalized && !isPlainObject(normalized.pluginData)) {
    delete normalized.pluginData;
  }
}
