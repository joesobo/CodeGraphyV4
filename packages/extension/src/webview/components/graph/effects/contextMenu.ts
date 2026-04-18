import type { GraphContextEffect } from '../contextActions/effects';

export interface GraphContextEffectHandlers {
  clearCachedFile(path: string): void;
  focusNode(nodeId: string): void;
  fitView(): void;
  openFilterPatternPrompt?(pattern: string): void;
  openLegendRulePrompt?(rule: { pattern: string; color: string; target: 'node' | 'edge' }): void;
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
      case 'promptFilterPattern':
        handlers.openFilterPatternPrompt?.(effect.pattern);
        break;
      case 'promptLegendRule':
        handlers.openLegendRulePrompt?.({
          pattern: effect.pattern,
          color: effect.color,
          target: effect.target,
        });
        break;
      case 'postMessage':
        handlers.postMessage(effect.message);
        break;
    }
  }
}
