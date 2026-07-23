import type { GraphContextEffect } from '../contextActions/effects';
import { graphStore } from '../../../store/state';

export interface GraphContextEffectHandlers {
  clearCachedFile(path: string): void;
  focusNode(nodeId: string): void;
  fitView(): void;
  openFilterPatternPrompt?(patterns: string[]): void;
  openLegendRulePrompt?(rule: { pattern: string; color: string; target: 'node' | 'edge' }): void;
  postMessage(message: { type: string; payload?: unknown }): void;
}

type GraphContextEffectKind = GraphContextEffect['kind'];
type GraphContextEffectByKind<Kind extends GraphContextEffectKind> =
  Extract<GraphContextEffect, { kind: Kind }>;

type GraphContextEffectAppliers = {
  [Kind in GraphContextEffectKind]: (
    effect: GraphContextEffectByKind<Kind>,
    handlers: GraphContextEffectHandlers,
  ) => void;
};

const EFFECT_APPLIERS: GraphContextEffectAppliers = {
  openFile: (effect, handlers) => {
    handlers.clearCachedFile(effect.path);
    handlers.postMessage({ type: 'OPEN_FILE', payload: { path: effect.path } });
  },
  focusNode: (effect, handlers) => {
    handlers.focusNode(effect.nodeId);
  },
  fitView: (_effect, handlers) => {
    handlers.fitView();
  },
  promptFilterPattern: (effect, handlers) => {
    handlers.openFilterPatternPrompt?.(effect.patterns);
  },
  promptLegendRule: (effect, handlers) => {
    handlers.openLegendRulePrompt?.({
      pattern: effect.pattern,
      color: effect.color,
      target: effect.target,
    });
  },
  postMessage: (effect, handlers) => {
    if (effect.message.type === 'TOGGLE_FAVORITE') {
      graphStore.getState().toggleFavoritesOptimistically(effect.message.payload.paths);
    }
    handlers.postMessage(effect.message);
  },
  runGraphViewContextMenuContribution: (effect) => {
    const report = (error: unknown): void => {
      console.error(
        `[CodeGraphy] Context menu contribution '${effect.contributionId}' from plugin '${effect.pluginId}' failed:`,
        error,
      );
    };
    try {
      void Promise.resolve(effect.run(effect.context)).catch(report);
    } catch (error) {
      report(error);
    }
  },
};

function applyContextEffect(
  effect: GraphContextEffect,
  handlers: GraphContextEffectHandlers,
): void {
  const apply = EFFECT_APPLIERS[effect.kind] as (
    effect: GraphContextEffect,
    handlers: GraphContextEffectHandlers,
  ) => void;
  apply(effect, handlers);
}

export function applyContextEffects(
  effects: GraphContextEffect[],
  handlers: GraphContextEffectHandlers
): void {
  for (const effect of effects) {
    applyContextEffect(effect, handlers);
  }
}
