import { createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan } from '@codegraphy-dev/core';
import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../../router';
import { applyPluginGraphWorkPlan } from '../../pluginGraphWork';

export async function applyPluginDataMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type !== 'UPDATE_PLUGIN_DATA') {
    return false;
  }

  const { pluginId, data } = message.payload;
  if (pluginId.length === 0) {
    return true;
  }

  const previousPluginData = handlers.getConfig<Record<string, unknown>>('pluginData', {});
  const previousData = previousPluginData[pluginId];
  const pluginData = {
    ...previousPluginData,
    [pluginId]: data,
  };
  await handlers.updateConfig('pluginData', pluginData);
  handlers.sendMessage({
    type: 'PLUGIN_DATA_UPDATED',
    payload: { pluginId, data },
  });

  if (hasPluginDataChanged(previousData, data)) {
    await applyPluginGraphWorkPlan(
      createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
        pluginId,
        settingKeys: getChangedPluginDataKeys(previousData, data),
        updateImpact: handlers.getInstalledPluginUpdateImpact?.(pluginId),
      }),
      pluginId,
      handlers,
    );
  }

  return true;
}

function hasPluginDataChanged(previousData: unknown, nextData: unknown): boolean {
  if (!isRecord(previousData) || !isRecord(nextData)) {
    return !Object.is(previousData, nextData);
  }

  return getChangedPluginDataKeys(previousData, nextData).length > 0;
}

function getChangedPluginDataKeys(previousData: unknown, nextData: unknown): string[] {
  const previousRecord = isRecord(previousData) ? previousData : undefined;
  const nextRecord = isRecord(nextData) ? nextData : undefined;

  if (!previousRecord && !nextRecord) {
    return [];
  }

  if (!previousRecord) {
    return Object.keys(nextRecord ?? {});
  }

  if (!nextRecord) {
    return Object.keys(previousRecord);
  }

  const keys = new Set([
    ...Object.keys(previousRecord),
    ...Object.keys(nextRecord),
  ]);

  return [...keys].filter(key => !Object.is(previousRecord[key], nextRecord[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
