import type { GraphContextEffect } from '../../graphContextActionEffects';

export interface GraphContextEffectHandlers {
  clearCachedFile(path: string): void;
  focusNode(nodeId: string): void;
  fitView(): void;
  postMessage(message: { type: string; payload?: unknown }): void;
}

export function applyContextEffects(
  effects: GraphContextEffect[],
  handlers: GraphContextEffectHandlers
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'openFile':
        handlers.clearCachedFile(effect.path);
        handlers.postMessage({ type: 'OPEN_FILE', payload: { path: effect.path } });
        break;
      case 'focusNode':
        handlers.focusNode(effect.nodeId);
        break;
      case 'fitView':
        handlers.fitView();
        break;
      case 'postMessage':
        handlers.postMessage(effect.message);
        break;
    }
  }
}
