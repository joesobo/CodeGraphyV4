import type { BuiltInContextMenuAction } from '../../contextMenu/contracts';
import type { GraphContextEffect } from '../effects';
import {
  createClipboardEffects,
  createCreateFileEffects,
  createOptionalClipboardEffects,
  createOptionalSinglePathMessageEffects,
  createPathListMessageEffects,
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
  open: (targetPaths: string[]) => createOpenFileEffects(targetPaths),
  reveal: (targetPaths: string[]) =>
    createOptionalSinglePathMessageEffects(targetPaths[0], 'REVEAL_IN_EXPLORER'),
  copyRelative: (targetPaths: string[]) => createClipboardEffects(targetPaths.join('\n')),
  copyAbsolute: (targetPaths: string[]) =>
    createOptionalClipboardEffects(targetPaths[0], (path) => `absolute:${path}`),
  copyEdgeSource: (targetPaths: string[]) => createOptionalClipboardEffects(targetPaths[0]),
  copyEdgeTarget: (targetPaths: string[]) => createOptionalClipboardEffects(targetPaths[1]),
  copyEdgeBoth: (targetPaths: string[]) => createClipboardEffects(targetPaths.join('\n')),
  toggleFavorite: (targetPaths: string[]) =>
    createPathListMessageEffects('TOGGLE_FAVORITE', targetPaths),
  focus: (targetPaths: string[]) => createFocusEffects(targetPaths[0]),
  addToFilter: (targetPaths: string[]) => createPatternPromptEffects(targetPaths),
  addNodeLegend: (targetPaths: string[]) =>
    createLegendPromptEffects(targetPaths[0], '#808080', 'node'),
  rename: (targetPaths: string[]) =>
    createOptionalSinglePathMessageEffects(targetPaths[0], 'RENAME_FILE'),
  delete: (targetPaths: string[]) => createPathListMessageEffects('DELETE_FILES', targetPaths),
  refresh: () => createRefreshEffects(),
  fitView: () => createFitViewEffects(),
  createFile: () => createCreateFileEffects(),
} satisfies Record<BuiltInContextMenuAction, (targetPaths: string[]) => GraphContextEffect[]>;

export function getBuiltInContextActionEffectsImpl(
  action: BuiltInContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  return BUILT_IN_CONTEXT_ACTION_EFFECTS[action](targetPaths);
}
