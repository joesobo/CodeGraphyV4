import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphKeyboardEffect } from '../keyboard/effects';

export interface GraphKeyboardEffectHandlers {
  fitView(): void;
  clearSelection(): void;
  openSelectedNodes(nodeIds: string[]): void;
  selectAll(nodeIds: string[]): void;
  zoom2d(factor: number): void;
  postMessage(message: WebviewToExtensionMessage): void;
  dispatchStoreMessage(message: ExtensionToWebviewMessage): void;
}

function applyKeyboardEffect(
  effect: GraphKeyboardEffect,
  handlers: GraphKeyboardEffectHandlers,
): void {
  switch (effect.kind) {
    case 'fitView':
      handlers.fitView();
      return;
    case 'clearSelection':
      handlers.clearSelection();
      return;
    case 'openSelectedNodes':
      handlers.openSelectedNodes(effect.nodeIds);
      return;
    case 'selectAll':
      handlers.selectAll(effect.nodeIds);
      return;
    case 'zoom':
      handlers.zoom2d(effect.factor);
      return;
    case 'postMessage':
      handlers.postMessage(effect.message);
      return;
    case 'dispatchStoreMessage':
      handlers.dispatchStoreMessage(effect.message);
      return;
  }
}

export function applyKeyboardEffects(
  effects: GraphKeyboardEffect[],
  handlers: GraphKeyboardEffectHandlers
): void {
  for (const effect of effects) {
    applyKeyboardEffect(effect, handlers);
  }
}
