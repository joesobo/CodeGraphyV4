import type { BuiltInContextMenuAction } from '../../contextMenu/contracts';
import type { GraphContextActionContext } from '../context';
import type { GraphContextEffect } from '../effects';
import {
  createClipboardEffects,
  createCreateFileEffects,
  createCreateFolderEffects,
  createGraphLayoutCollapseEffects,
  createGraphSectionEffects,
  createGraphSectionCollapseEffects,
  createGraphSectionDeleteEffects,
  createClearPinNodeEffects,
  createOptionalClipboardEffects,
  createOptionalSinglePathMessageEffects,
  createPathListMessageEffects,
  createPinNodeEffects,
  createRefreshEffects,
} from '../messages';
import {
  createFitViewEffects,
  createFocusEffects,
  createLegendPromptEffects,
  createOpenFileEffects,
  createPatternPromptEffects,
} from '../prompts';

const BUILT_IN_CONTEXT_ACTION_EFFECTS = {
  open: (context: GraphContextActionContext) => createOpenFileEffects(context.targetIds),
  openEdgeSource: (context: GraphContextActionContext) =>
    createOpenFileEffects(context.edgeSourceId ? [context.edgeSourceId] : []),
  openEdgeTarget: (context: GraphContextActionContext) =>
    createOpenFileEffects(context.edgeTargetId ? [context.edgeTargetId] : []),
  reveal: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'REVEAL_IN_EXPLORER'),
  copyRelative: (context: GraphContextActionContext) =>
    createClipboardEffects(context.targetIds.join('\n')),
  copyAbsolute: (context: GraphContextActionContext) =>
    createOptionalClipboardEffects(context.primaryTargetId, (path) => `absolute:${path}`),
  copySymbolId: (context: GraphContextActionContext) =>
    createOptionalClipboardEffects(context.primaryNode?.symbol?.id ?? context.primaryTargetId),
  copySymbolName: (context: GraphContextActionContext) =>
    createOptionalClipboardEffects(context.primaryNode?.symbol?.name ?? context.primaryNode?.label),
  copyEdgeSource: (context: GraphContextActionContext) =>
    createOptionalClipboardEffects(context.edgeSourceId),
  copyEdgeTarget: (context: GraphContextActionContext) =>
    createOptionalClipboardEffects(context.edgeTargetId),
  copyEdgeBoth: (context: GraphContextActionContext) =>
    createClipboardEffects(context.targetIds.join('\n')),
  toggleFavorite: (context: GraphContextActionContext) =>
    createPathListMessageEffects('TOGGLE_FAVORITE', context.targetIds),
  pinNode: (context: GraphContextActionContext) => createPinNodeEffects(context),
  unpinNode: (context: GraphContextActionContext) => createClearPinNodeEffects(context),
  focus: (context: GraphContextActionContext) => createFocusEffects(context.primaryTargetId),
  addToFilter: (context: GraphContextActionContext) =>
    createPatternPromptEffects(context.targetIds),
  addNodeLegend: (context: GraphContextActionContext) =>
    createLegendPromptEffects(context.primaryTargetId, '#808080', 'node'),
  rename: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'RENAME_FILE'),
  delete: (context: GraphContextActionContext) =>
    createPathListMessageEffects('DELETE_FILES', context.targetIds),
  refresh: () => createRefreshEffects(),
  fitView: () => createFitViewEffects(),
  createFile: (context: GraphContextActionContext) =>
    createCreateFileEffects(context.mutationDirectory, context.ownerSectionId),
  createFolder: (context: GraphContextActionContext) =>
    createCreateFolderEffects(context.mutationDirectory, context.ownerSectionId),
  collapseNode: (context: GraphContextActionContext) =>
    createGraphLayoutCollapseEffects(context.primaryTargetId, true),
  expandNode: (context: GraphContextActionContext) =>
    createGraphLayoutCollapseEffects(context.primaryTargetId, false),
  createGraphSection: (context: GraphContextActionContext) =>
    createGraphSectionEffects(context),
  expandGraphSection: (context: GraphContextActionContext) =>
    createGraphSectionCollapseEffects(context, false),
  collapseGraphSection: (context: GraphContextActionContext) =>
    createGraphSectionCollapseEffects(context, true),
  deleteGraphSection: (context: GraphContextActionContext) =>
    createGraphSectionDeleteEffects(context),
} satisfies Record<BuiltInContextMenuAction, (context: GraphContextActionContext) => GraphContextEffect[]>;

export function getBuiltInContextActionEffectsImpl(
  action: BuiltInContextMenuAction,
  context: GraphContextActionContext
): GraphContextEffect[] {
  return BUILT_IN_CONTEXT_ACTION_EFFECTS[action](context);
}
