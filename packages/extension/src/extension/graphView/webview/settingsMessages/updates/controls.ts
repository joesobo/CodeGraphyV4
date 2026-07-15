import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';
import { applyGraphControlsUpdate } from './controlConfig';
import { applyGraphControlVisibilityBatch } from './controlVisibilityBatch';
import { isSymbolDependentNodeType } from './symbolNodeType';
import {
  applySymbolDependentVisibilityUpdate,
  applySymbolVisibilityUpdate,
} from './symbolVisibility';

export async function applyGraphControlMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH') {
    return applyGraphControlVisibilityBatch(message, handlers);
  }

  if (message.type === 'UPDATE_NODE_VISIBILITY') {
    return applyNodeVisibilityUpdate(message.payload.nodeType, message.payload.visible, handlers);
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
    return applyNodeColorUpdate(message.payload.nodeType, message.payload.color, handlers);
  }

  return false;
}

function applyNodeVisibilityUpdate(
  nodeType: string,
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (nodeType === 'symbol') {
    return applySymbolVisibilityUpdate(visible, handlers);
  }
  if (isSymbolDependentNodeType(nodeType)) {
    return applySymbolDependentVisibilityUpdate(nodeType, visible, handlers);
  }
  return applyGraphControlsUpdate('nodeVisibility', nodeType, visible, handlers);
}

async function applyNodeColorUpdate(
  nodeType: string,
  color: string,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await applyGraphControlsUpdate('nodeColors', nodeType, color, handlers, { publish: false });
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  handlers.sendGraphControls();
  return true;
}
