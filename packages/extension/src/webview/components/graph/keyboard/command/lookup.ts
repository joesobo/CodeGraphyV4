import type { GraphKeyboardCommand, GraphKeyboardOptions } from '../effects';
import {
  createClearSelectionCommand,
  createFitViewCommand,
  createOpenSelectedNodesCommand,
  createSelectAllCommand,
} from './builders';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from '../shortcutResolvers';
import { getToolbarShortcutCommand } from '../toolbarShortcutResolver';
import { isPackageNodeId } from '../../model/node/identity';

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
    getZoomShortcutCommand(options.key, options.isMod) ??
    getHistoryShortcutCommand(options.key, options.isMod, options.shiftKey) ??
    getToolbarShortcutCommand(options.key, options.isMod)
  );
}

function getDirectGraphKeyboardCommand(
  options: GraphKeyboardOptions,
): GraphKeyboardCommand | null | undefined {
  const directCommands: Partial<Record<string, GraphKeyboardCommand | null>> = {
    '0': createFitViewCommand(),
    Escape: createClearSelectionCommand(),
    Delete: null,
    Backspace: null,
    'a': options.isMod ? createSelectAllCommand(options.allNodeIds) : null,
  };

  return options.key === 'Enter'
    ? getEnterCommand(options.selectedNodeIds)
    : directCommands[options.key];
}

export function getGraphKeyboardCommandImpl(
  options: GraphKeyboardOptions
): GraphKeyboardCommand | null {
  if (options.targetIsEditable) {
    return null;
  }

  const directCommand = getDirectGraphKeyboardCommand(options);
  return directCommand === undefined ? getShortcutCommand(options) : directCommand;
}
