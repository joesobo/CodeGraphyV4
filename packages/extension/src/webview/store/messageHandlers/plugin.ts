import type { PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../shared/plugins/decorations';
import { arePlainValuesEqual } from './equality';

export function handlePluginsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>,
): PartialState {
  return { pluginStatuses: message.payload.plugins };
}

export function handleDecorationsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>,
  ctx: { getState: () => { nodeDecorations: Record<string, NodeDecorationPayload>; edgeDecorations: Record<string, EdgeDecorationPayload> } },
): PartialState | void {
  const state = ctx.getState();
  const { nodeDecorations, edgeDecorations } = message.payload;

  if (
    arePlainValuesEqual(state.nodeDecorations, nodeDecorations) &&
    arePlainValuesEqual(state.edgeDecorations, edgeDecorations)
  ) {
    return;
  }

  return {
    nodeDecorations,
    edgeDecorations,
  };
}

export function handleContextMenuItems(
  message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>,
): PartialState {
  return { pluginContextMenuItems: message.payload.items };
}

export function handlePluginExportersUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_EXPORTERS_UPDATED' }>,
): PartialState {
  return { pluginExporters: message.payload.items };
}

export function handlePluginToolbarActionsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED' }>,
): PartialState {
  return { pluginToolbarActions: message.payload.items };
}

export function handleDagModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DAG_MODE_UPDATED' }>,
): PartialState {
  return { dagMode: message.payload.dagMode };
}

export function handleNodeSizeModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>,
): PartialState {
  return { nodeSizeMode: message.payload.nodeSizeMode };
}
