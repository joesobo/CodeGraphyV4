import type { PartialState } from '../messageTypes';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../shared/plugins/decorations';
import { arePlainValuesEqual } from './equality/compare';

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

export function handleNodeSizeModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>,
): PartialState {
  return { nodeSizeMode: message.payload.nodeSizeMode };
}
