import type { BuiltInContextMenuAction } from '../contextMenu/contracts';
import type { GraphContextEffect } from './effects';
import {
  createClipboardEffects,
  createCreateFileEffects,
  createFitViewEffects,
  createFocusEffects,
  createOpenFileEffects,
  createOptionalClipboardEffects,
  createOptionalSinglePathMessageEffects,
  createPathListMessageEffects,
  createPatternMessageEffects,
  createRefreshEffects,
} from './builders';

export function getBuiltInContextActionEffectsImpl(
  action: BuiltInContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  switch (action) {
    case 'open':
      return createOpenFileEffects(targetPaths);
    case 'reveal':
      return createOptionalSinglePathMessageEffects(targetPaths[0], 'REVEAL_IN_EXPLORER');
    case 'copyRelative':
      return createClipboardEffects(targetPaths.join('\n'));
    case 'copyAbsolute':
      return createOptionalClipboardEffects(targetPaths[0], path => `absolute:${path}`);
    case 'copyEdgeSource':
      return createOptionalClipboardEffects(targetPaths[0]);
    case 'copyEdgeTarget':
      return createOptionalClipboardEffects(targetPaths[1]);
    case 'copyEdgeBoth':
      return createClipboardEffects(targetPaths.join('\n'));
    case 'toggleFavorite':
      return createPathListMessageEffects('TOGGLE_FAVORITE', targetPaths);
    case 'focus':
      return createFocusEffects(targetPaths[0]);
    case 'addToFilter':
      return createPatternMessageEffects(targetPaths);
    case 'rename':
      return createOptionalSinglePathMessageEffects(targetPaths[0], 'RENAME_FILE');
    case 'delete':
      return createPathListMessageEffects('DELETE_FILES', targetPaths);
    case 'refresh':
      return createRefreshEffects();
    case 'fitView':
      return createFitViewEffects();
    case 'createFile':
      return createCreateFileEffects();
  }
}
