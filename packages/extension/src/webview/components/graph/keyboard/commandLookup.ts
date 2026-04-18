import type { GraphKeyboardCommand, GraphKeyboardOptions } from './effects';
import {
  createClearSelectionCommand,
  createFitViewCommand,
  createOpenSelectedNodesCommand,
  createSelectAllCommand,
} from './commandBuilders';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from './shortcutResolvers';
import { getToolbarShortcutCommand } from './toolbarShortcutResolver';

function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

function getEnterCommand(selectedNodeIds: readonly string[]): GraphKeyboardCommand | null {
  if (selectedNodeIds.length === 0) {
    return null;
  }

  return createOpenSelectedNodesCommand(
    selectedNodeIds.filter(nodeId => !isPackageNodeId(nodeId)),
  );
}

function getShortcutCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null {
  return (
    getZoomShortcutCommand(options.key, options.isMod, options.graphMode) ??
    getHistoryShortcutCommand(options.key, options.isMod, options.shiftKey) ??
    getToolbarShortcutCommand(options.key, options.isMod)
  );
}

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
      return getEnterCommand(selectedNodeIds);
    case 'a':
      return isMod ? createSelectAllCommand(allNodeIds) : null;
    default:
      return getShortcutCommand({ key, isMod, shiftKey, graphMode, selectedNodeIds, allNodeIds, targetIsEditable });
  }
}
