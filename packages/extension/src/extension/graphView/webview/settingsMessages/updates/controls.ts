import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import { pruneGraphControlConfigMap, type GraphControlConfigKey } from '../../../../../shared/graphControls/settings';
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

async function applyGraphControlsUpdate(
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

async function applySymbolVisibilityUpdate(
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const nodeVisibility: Record<string, boolean> = {
    ...pruneGraphControlConfigMap(
      'nodeVisibility',
      handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
    ),
    symbol: visible,
  };

  await handlers.updateConfig('nodeVisibility', nodeVisibility);

  if (visible) {
    await handlers.updateConfig('edgeVisibility', {
      ...handlers.getConfig<Record<string, boolean>>('edgeVisibility', {}),
      contains: true,
    });
  }

  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  handlers.sendGraphControls();
  if (visible) {
    await handlers.reprocessGraphScope();
    return true;
  }

  handlers.smartRebuild('symbol');
  return true;
}

export async function applyGraphControlMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_NODE_VISIBILITY') {
    if (message.payload.nodeType === 'symbol') {
      return applySymbolVisibilityUpdate(message.payload.visible, handlers);
    }

    return applyGraphControlsUpdate(
      'nodeVisibility',
      message.payload.nodeType,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_EDGE_VISIBILITY') {
    return applyGraphControlsUpdate(
      'edgeVisibility',
      message.payload.edgeKind,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_NODE_COLOR') {
    await applyGraphControlsUpdate(
      'nodeColors',
      message.payload.nodeType,
      message.payload.color,
      handlers,
      { publish: false },
    );
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
    handlers.sendGraphControls();
    return true;
  }

  return false;
}
