import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

function getUpdatedConfigMap(
  handlers: GraphViewSettingsMessageHandlers,
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors',
  entryKey: string,
  value: boolean | string,
): Record<string, boolean | string> {
  return {
    ...handlers.getConfig<Record<string, boolean | string>>(key, {}),
    [entryKey]: value,
  };
}

async function applyGraphControlsUpdate(
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors',
  entryKey: string,
  value: boolean | string,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig(key, getUpdatedConfigMap(handlers, key, entryKey, value));
  if (key === 'nodeVisibility' || key === 'nodeColors') {
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
  }
  handlers.sendGraphControls();
  return true;
}

export async function applyGraphControlMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_NODE_VISIBILITY') {
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
    return applyGraphControlsUpdate(
      'nodeColors',
      message.payload.nodeType,
      message.payload.color,
      handlers,
    );
  }

  return false;
}
