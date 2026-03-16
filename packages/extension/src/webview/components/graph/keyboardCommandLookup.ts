import type { GraphKeyboardCommand, GraphKeyboardOptions } from '../graphKeyboardEffects';
import {
  createClearSelectionCommand,
  createFitViewCommand,
  createOpenSelectedNodesCommand,
  createSelectAllCommand,
} from './keyboardCommandBuilders';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from './keyboardShortcutResolvers';
import { getToolbarShortcutCommand } from './keyboardToolbarShortcutResolver';

export function getGraphKeyboardCommandImpl(
  options: GraphKeyboardOptions
): GraphKeyboardCommand | null {
  const { key, isMod, shiftKey, graphMode, selectedNodeIds, allNodeIds, targetIsEditable } = options;

  if (targetIsEditable) {
    return null;
  }

  switch (key) {
    case '0':
      return createFitViewCommand();
    case 'Escape':
      return createClearSelectionCommand();
    case 'Enter':
      return selectedNodeIds.length > 0 ? createOpenSelectedNodesCommand(selectedNodeIds) : null;
    case 'a':
      return isMod ? createSelectAllCommand(allNodeIds) : null;
    default:
      return (
        getZoomShortcutCommand(key, isMod, graphMode) ??
        getHistoryShortcutCommand(key, isMod, shiftKey) ??
        getToolbarShortcutCommand(key, isMod)
      );
  }
}
