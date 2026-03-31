import type { PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../shared/plugins/decorations';

function arePlainValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => arePlainValuesEqual(value, right[index]));
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    key => key in rightRecord && arePlainValuesEqual(leftRecord[key], rightRecord[key]),
  );
}

function areDecorationRecordsEqual<T extends NodeDecorationPayload | EdgeDecorationPayload>(
  current: Record<string, T>,
  next: Record<string, T>,
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return currentKeys.every(
    key => key in next && arePlainValuesEqual(current[key], next[key]),
  );
}

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
    areDecorationRecordsEqual(state.nodeDecorations, nodeDecorations) &&
    areDecorationRecordsEqual(state.edgeDecorations, edgeDecorations)
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
