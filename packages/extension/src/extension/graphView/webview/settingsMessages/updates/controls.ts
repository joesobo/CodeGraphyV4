import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

function getUpdatedConfigMap(
  handlers: GraphViewSettingsMessageHandlers,
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors' | 'nodeColorEnabled',
  entryKey: string,
  value: boolean | string,
): Record<string, boolean | string> {
  return {
    ...handlers.getConfig<Record<string, boolean | string>>(key, {}),
    [entryKey]: value,
  };
}

async function applyGraphControlsUpdate(
  key: 'nodeVisibility' | 'edgeVisibility' | 'nodeColors' | 'nodeColorEnabled',
  entryKey: string,
  value: boolean | string,
  handlers: GraphViewSettingsMessageHandlers,
  options: { publish?: boolean } = {},
): Promise<boolean> {
  await handlers.updateConfig(key, getUpdatedConfigMap(handlers, key, entryKey, value));
  if (options.publish === false) {
    return true;
  }
  if (key === 'nodeVisibility' || key === 'nodeColors' || key === 'nodeColorEnabled') {
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
    await applyGraphControlsUpdate(
      'nodeColors',
      message.payload.nodeType,
      message.payload.color,
      handlers,
      { publish: false },
    );
    if (typeof message.payload.enabled === 'boolean') {
      await applyGraphControlsUpdate(
        'nodeColorEnabled',
        message.payload.nodeType,
        message.payload.enabled,
        handlers,
        { publish: false },
      );
    }
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
    handlers.sendGraphControls();
    return true;
  }

  return false;
}
