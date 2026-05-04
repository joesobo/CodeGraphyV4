import {
  getGraphContextActionEffects,
  type GraphContextEffect,
} from '../contextActions/effects';
import type { GraphContextActionContext } from '../contextActions/context';
import type { GraphContextMenuAction } from '../contextMenu/contracts';
import { applyContextEffects as runContextEffects } from '../effects/contextMenu';
import type { GraphContextMenuRuntimeDependencies } from './controller';

type GraphContextMenuEffectDependencies = Pick<
  GraphContextMenuRuntimeDependencies,
  | 'clearCachedFile'
  | 'fitView'
  | 'focusNode'
  | 'openFilterPatternPrompt'
  | 'openLegendRulePrompt'
  | 'postMessage'
>;

export interface GraphContextMenuEffectRuntime {
  applyContextEffects(effects: GraphContextEffect[]): void;
  handleMenuAction(action: GraphContextMenuAction, context: GraphContextActionContext): void;
}

export function createContextMenuEffectRuntime(
  dependencies: GraphContextMenuEffectDependencies,
): GraphContextMenuEffectRuntime {
  const applyContextEffects = (effects: GraphContextEffect[]): void => {
    runContextEffects(effects, {
      clearCachedFile: (path) => dependencies.clearCachedFile(path),
      fitView: () => dependencies.fitView(),
      focusNode: (nodeId) => dependencies.focusNode(nodeId),
      openFilterPatternPrompt: (patterns) => dependencies.openFilterPatternPrompt?.(patterns),
      openLegendRulePrompt: (rule) => dependencies.openLegendRulePrompt?.(rule),
      postMessage: (message) => dependencies.postMessage(message),
    });
  };

  const handleMenuAction = (
    action: GraphContextMenuAction,
    context: GraphContextActionContext,
  ): void => {
    applyContextEffects(getGraphContextActionEffects(action, context));
  };

  return {
    applyContextEffects,
    handleMenuAction,
  };
}
