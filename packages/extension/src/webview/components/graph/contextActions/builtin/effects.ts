import type { BuiltInContextMenuAction } from '../../contextMenu/contracts';
import type { GraphContextActionContext } from '../context';
import type { GraphContextEffect } from '../effects';
import {
  createClipboardEffects,
  createCreateFileEffects,
  createCreateFolderEffects,
  createOptionalClipboardEffects,
  createOptionalSinglePathMessageEffects,
  createPathListMessageEffects,
  createPasteFileEffects,
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
  openToSide: (context: GraphContextActionContext) =>
    createPathListMessageEffects('OPEN_FILES_TO_SIDE', context.targetIds),
  findInFolder: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'FIND_IN_FOLDER'),
  closeEditor: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'CLOSE_FILE_EDITOR'),
  openWith: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'OPEN_FILE_WITH'),
  openInTerminal: (context: GraphContextActionContext) =>
    createOptionalSinglePathMessageEffects(context.primaryTargetId, 'OPEN_IN_TERMINAL'),
  selectForCompare: (context: GraphContextActionContext) => context.primaryTargetId
    ? [{ kind: 'setCompareSelectedPath', path: context.primaryTargetId }]
    : [],
  compareWithSelected: (context: GraphContextActionContext) => {
    if (
      !context.comparisonPath
      || !context.primaryTargetId
      || context.comparisonPath === context.primaryTargetId
    ) {
      return [];
    }

    return [
      {
        kind: 'postMessage',
        message: {
          type: 'COMPARE_FILES',
          payload: {
            leftPath: context.comparisonPath,
            rightPath: context.primaryTargetId,
          },
        },
      },
      { kind: 'setCompareSelectedPath', path: null },
    ];
  },
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
  cutFiles: (context: GraphContextActionContext) =>
    createPathListMessageEffects('CUT_FILES', context.targetIds),
  copyFiles: (context: GraphContextActionContext) =>
    createPathListMessageEffects('COPY_FILES', context.targetIds),
  pasteFiles: (context: GraphContextActionContext) =>
    createPasteFileEffects(context.mutationDirectory),
  toggleFavorite: (context: GraphContextActionContext) =>
    createPathListMessageEffects('TOGGLE_FAVORITE', context.targetIds),
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
    createCreateFileEffects(context.mutationDirectory),
  createFolder: (context: GraphContextActionContext) =>
    createCreateFolderEffects(context.mutationDirectory),
} satisfies Record<BuiltInContextMenuAction, (context: GraphContextActionContext) => GraphContextEffect[]>;

export function getBuiltInContextActionEffectsImpl(
  action: BuiltInContextMenuAction,
  context: GraphContextActionContext
): GraphContextEffect[] {
  return BUILT_IN_CONTEXT_ACTION_EFFECTS[action](context);
}
