import {
  pruneGraphControlConfigMap,
  type GraphControlConfigKey,
} from '../../../../../shared/graphControls/settings';
import { isPlainObject } from '../plainObject';

function normalizeGraphControlConfigMap(
  normalized: Record<string, unknown>,
  key: GraphControlConfigKey,
): void {
  const value = normalized[key];
  if (!isPlainObject(value)) {
    return;
  }

  normalized[key] = pruneGraphControlConfigMap(key, value as Record<string, boolean | string>);
}

export function normalizePersistedGraphControls(normalized: Record<string, unknown>): void {
  normalizeGraphControlConfigMap(normalized, 'nodeVisibility');
  normalizeGraphControlConfigMap(normalized, 'nodeColors');
}
