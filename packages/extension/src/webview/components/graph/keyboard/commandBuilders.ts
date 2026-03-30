import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphKeyboardCommand, GraphKeyboardEffect } from './effects';

type HistoryMessageType = Extract<WebviewToExtensionMessage['type'], 'UNDO' | 'REDO'>;
type StoreMessageType = Extract<ExtensionToWebviewMessage['type'], 'CYCLE_VIEW' | 'CYCLE_LAYOUT' | 'TOGGLE_DIMENSION'>;

function createCommand(effect: GraphKeyboardEffect, stopPropagation = false): GraphKeyboardCommand {
  return {
    preventDefault: true,
    stopPropagation,
    effects: [effect],
  };
}

export function createFitViewCommand(): GraphKeyboardCommand {
  return createCommand({ kind: 'fitView' });
}

export function createClearSelectionCommand(): GraphKeyboardCommand {
  return createCommand({ kind: 'clearSelection' });
}

export function createOpenSelectedNodesCommand(nodeIds: string[]): GraphKeyboardCommand {
  return createCommand({ kind: 'openSelectedNodes', nodeIds });
}

export function createSelectAllCommand(nodeIds: string[]): GraphKeyboardCommand {
  return createCommand({ kind: 'selectAll', nodeIds });
}

export function createZoomCommand(factor: number): GraphKeyboardCommand {
  return createCommand({ kind: 'zoom', factor });
}

export function createHistoryCommand(type: HistoryMessageType): GraphKeyboardCommand {
  return createCommand({ kind: 'postMessage', message: { type } }, true);
}

export function createStoreMessageCommand(type: StoreMessageType): GraphKeyboardCommand {
  return createCommand({ kind: 'dispatchStoreMessage', message: { type } });
}
