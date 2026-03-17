/**
 * @fileoverview Store message handlers for plugin/decoration messages.
 * @module webview/storeMessageHandlersPlugin
 */

import type { ExtensionToWebviewMessage } from '../shared/types';
import type { PartialState } from './storeMessageTypes';

export function handlePluginsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>,
): PartialState {
  return { pluginStatuses: message.payload.plugins };
}

export function handleDecorationsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>,
): PartialState {
  return {
    nodeDecorations: message.payload.nodeDecorations,
    edgeDecorations: message.payload.edgeDecorations,
  };
}

export function handleContextMenuItems(
  message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>,
): PartialState {
  return { pluginContextMenuItems: message.payload.items };
}

export function handleDagModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DAG_MODE_UPDATED' }>,
): PartialState {
  return { dagMode: message.payload.dagMode };
}

export function handleFolderNodeColorUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FOLDER_NODE_COLOR_UPDATED' }>,
): PartialState {
  return { folderNodeColor: message.payload.folderNodeColor };
}

export function handleNodeSizeModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>,
): PartialState {
  return { nodeSizeMode: message.payload.nodeSizeMode };
}
