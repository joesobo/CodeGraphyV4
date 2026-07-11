import {
  getGraphContextActionEffects,
  type GraphContextEffect,
} from '../contextActions/effects';
import type { GraphContextActionContext } from '../contextActions/context';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from '../contextMenu/contracts';
import { classifyGraphContextNodeTarget } from '../contextMenu/decision/targets';
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
  | 'refreshContextSelection'
>;

export interface GraphContextMenuEffectRuntime {
  applyContextEffects(effects: GraphContextEffect[]): void;
  handleMenuAction(action: GraphContextMenuAction, context: GraphContextActionContext): void;
}

const NODE_ACTIONS = new Set<BuiltInContextMenuAction>([
  'open',
  'openToSide',
  'findInFolder',
  'closeEditor',
  'openWith',
  'openInTerminal',
  'selectForCompare',
  'compareWithSelected',
  'cutFiles',
  'copyFiles',
  'reveal',
  'copyRelative',
  'copyAbsolute',
  'copySymbolId',
  'copySymbolName',
  'toggleFavorite',
  'focus',
  'addToFilter',
  'addNodeLegend',
  'rename',
  'delete',
]);

const EDGE_ACTIONS = new Set<BuiltInContextMenuAction>([
  'openEdgeSource',
  'openEdgeTarget',
  'copyEdgeSource',
  'copyEdgeTarget',
  'copyEdgeBoth',
]);

const BACKGROUND_ACTIONS = new Set<BuiltInContextMenuAction>([
  'refresh',
  'fitView',
]);

function isFolderCreationContext(context: GraphContextActionContext): boolean {
  return context.selectionKind === 'background'
    || context.primaryTargetId === '(root)'
    || context.primaryNode?.nodeType === 'folder';
}

function isCompareActionValid(
  action: Extract<BuiltInContextMenuAction, 'selectForCompare' | 'compareWithSelected'>,
  menuAction: Extract<GraphContextMenuAction, { kind: 'builtin' }>,
  context: GraphContextActionContext,
): boolean {
  if (
    context.timelineActive
    || context.selectionKind !== 'node'
    || context.targetIds.length !== 1
    || !context.primaryTargetId
    || classifyGraphContextNodeTarget(context.primaryTargetId, context.primaryNode).nodeKind !== 'file'
  ) {
    return false;
  }

  if (action === 'selectForCompare') return true;
  if (!menuAction.comparisonPath || !context.availableNodes) return false;
  const comparisonNode = context.availableNodes.find(node => node.id === menuAction.comparisonPath);
  return Boolean(
    comparisonNode
    && classifyGraphContextNodeTarget(menuAction.comparisonPath, comparisonNode).nodeKind === 'file'
  );
}

function isBuiltInActionValid(
  action: BuiltInContextMenuAction,
  context: GraphContextActionContext,
): boolean {
  if (BACKGROUND_ACTIONS.has(action)) {
    return context.selectionKind === 'background';
  }

  if (action === 'createFile' || action === 'createFolder' || action === 'pasteFiles') {
    return isFolderCreationContext(context);
  }

  if (EDGE_ACTIONS.has(action)) {
    return context.selectionKind === 'edge';
  }

  if (NODE_ACTIONS.has(action)) {
    return context.selectionKind === 'node';
  }

  return false;
}

function selectedIdsMatchContext(
  selectedIds: readonly string[],
  context: GraphContextActionContext,
): boolean {
  return selectedIds.length === context.targetIds.length
    && selectedIds.every((id, index) => id === context.targetIds[index]);
}

function isGraphViewPluginActionValid(
  action: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>,
  context: GraphContextActionContext,
): boolean {
  return context.selectionKind === 'background'
    ? isGraphViewBackgroundActionValid(action)
    : context.selectionKind === 'edge'
      ? isGraphViewEdgeActionValid(action, context)
      : isGraphViewNodeActionValid(action, context);
}

function isGraphViewBackgroundActionValid(
  action: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>,
): boolean {
  return action.context.target.kind === 'background'
    && action.context.selectedNodeIds.length === 0
    && action.context.selectedEdgeIds.length === 0;
}

function isGraphViewEdgeActionValid(
  action: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>,
  context: GraphContextActionContext,
): boolean {
  return action.context.selectedEdgeIds.includes(context.edgeId ?? '')
    && action.context.selectedNodeIds.length === 0;
}

function isGraphViewNodeActionValid(
  action: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>,
  context: GraphContextActionContext,
): boolean {
  return selectedIdsMatchContext(action.context.selectedNodeIds, context)
    && action.context.selectedEdgeIds.length === 0;
}

function isPluginActionValid(
  action: Extract<GraphContextMenuAction, { kind: 'plugin' }>,
  context: GraphContextActionContext,
): boolean {
  if (action.targetType === 'node') {
    return context.selectionKind === 'node' && context.targetIds.includes(action.targetId);
  }

  return context.selectionKind === 'edge'
    && (action.targetId === context.edgeId || context.targetIds.includes(action.targetId));
}

function isMenuActionValid(
  action: GraphContextMenuAction,
  context: GraphContextActionContext,
): boolean {
  if (action.kind === 'builtin') {
    if (action.action === 'selectForCompare' || action.action === 'compareWithSelected') {
      return isCompareActionValid(action.action, action, context);
    }
    return isBuiltInActionValid(action.action, context);
  }

  if (action.kind === 'plugin') {
    return isPluginActionValid(action, context);
  }

  return isGraphViewPluginActionValid(action, context);
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
    if (!isMenuActionValid(action, context)) {
      return;
    }

    applyContextEffects(getGraphContextActionEffects(action, context));

    if (action.kind === 'builtin' && action.action === 'toggleFavorite') {
      dependencies.refreshContextSelection?.();
    }
  };

  return {
    applyContextEffects,
    handleMenuAction,
  };
}
