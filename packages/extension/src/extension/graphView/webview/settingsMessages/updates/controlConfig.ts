import {
  pruneGraphControlConfigMap,
  type GraphControlConfigKey,
} from '../../../../../shared/graphControls/settings';
import type { GraphViewSettingsMessageHandlers } from '../router';

function getUpdatedConfigMap(
  handlers: GraphViewSettingsMessageHandlers,
  key: GraphControlConfigKey,
  entryKey: string,
  value: boolean | string,
): Record<string, boolean | string> {
  return pruneGraphControlConfigMap(key, {
    ...handlers.getConfig<Record<string, boolean | string>>(key, {}),
    [entryKey]: value,
  });
}

export async function applyGraphControlsUpdate(
  key: GraphControlConfigKey,
  entryKey: string,
  value: boolean | string,
  handlers: GraphViewSettingsMessageHandlers,
  options: { publish?: boolean } = {},
): Promise<boolean> {
  await handlers.updateConfig(key, getUpdatedConfigMap(handlers, key, entryKey, value));
  if (options.publish === false) {
    return true;
  }
  if (key === 'nodeVisibility' || key === 'nodeColors') {
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
  }
  handlers.sendGraphControls();
  return true;
}
