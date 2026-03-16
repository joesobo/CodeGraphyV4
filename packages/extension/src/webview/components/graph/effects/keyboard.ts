import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../../../shared/types';
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

export function applyKeyboardEffects(
  effects: GraphKeyboardEffect[],
  handlers: GraphKeyboardEffectHandlers
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'fitView':
        handlers.fitView();
        break;
      case 'clearSelection':
        handlers.clearSelection();
        break;
      case 'openSelectedNodes':
        handlers.openSelectedNodes(effect.nodeIds);
        break;
      case 'selectAll':
        handlers.selectAll(effect.nodeIds);
        break;
      case 'zoom':
        handlers.zoom2d(effect.factor);
        break;
      case 'postMessage':
        handlers.postMessage(effect.message);
        break;
      case 'dispatchStoreMessage':
        handlers.dispatchStoreMessage(effect.message);
        break;
    }
  }
}
