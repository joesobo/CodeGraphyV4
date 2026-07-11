import type { GraphKeyboardCommand, GraphKeyboardOptions } from '../effects';
import {
  createClearSelectionCommand,
  createFitViewCommand,
  createFileMessageCommand,
  createOpenSelectedNodesCommand,
  createSelectAllCommand,
} from './builders';
import {
  getHistoryShortcutCommand,
  getZoomShortcutCommand,
} from '../shortcutResolvers';
import { getToolbarShortcutCommand } from '../toolbarShortcutResolver';

function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

function getEnterCommand(
  selectedNodeIds: readonly string[],
  openToSide: boolean,
): GraphKeyboardCommand | null {
  if (selectedNodeIds.length === 0) {
    return null;
  }

  const nodeIds = selectedNodeIds.filter(nodeId => !isPackageNodeId(nodeId));
  return openToSide
    ? createFileMessageCommand({ type: 'OPEN_FILES_TO_SIDE', payload: { paths: nodeIds } })
    : createOpenSelectedNodesCommand(nodeIds);
}

function getShortcutCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null {
  return (
    getFileClipboardShortcutCommand(options) ??
    getZoomShortcutCommand(options.key, options.isMod, options.graphMode) ??
    getHistoryShortcutCommand(options.key, options.isMod, options.shiftKey) ??
    getToolbarShortcutCommand(options.key, options.isMod)
  );
}

function getFileClipboardShortcutCommand(
  options: GraphKeyboardOptions,
): GraphKeyboardCommand | null {
  if (!options.isMod || (options.mutationAvailability ?? 'enabled') !== 'enabled') return null;

  const paths = options.selectedNodeIds.filter(nodeId => !isPackageNodeId(nodeId));
  switch (options.key.toLowerCase()) {
    case 'c':
      return paths.length > 0
        ? createFileMessageCommand({ type: 'COPY_FILES', payload: { paths } })
        : null;
    case 'x':
      return paths.length > 0
        ? createFileMessageCommand({ type: 'CUT_FILES', payload: { paths } })
        : null;
    case 'v':
      return createFileMessageCommand({
        type: 'PASTE_FILES',
        payload: { directory: options.pasteDirectory ?? '.' },
      });
    default:
      return null;
  }
}

function getDirectGraphKeyboardCommand(
  options: GraphKeyboardOptions,
): GraphKeyboardCommand | null | undefined {
  const selectedWorkspacePaths = options.selectedNodeIds.filter(nodeId => !isPackageNodeId(nodeId));
  const mutationsEnabled = (options.mutationAvailability ?? 'enabled') === 'enabled';
  const deleteCommand = mutationsEnabled && selectedWorkspacePaths.length > 0
    ? createFileMessageCommand({
      type: 'DELETE_FILES',
      payload: { paths: selectedWorkspacePaths },
    })
    : null;
  const renameCommand = mutationsEnabled && selectedWorkspacePaths.length === 1
    ? createFileMessageCommand({
      type: 'RENAME_FILE',
      payload: { path: selectedWorkspacePaths[0] },
    })
    : null;
  const directCommands: Partial<Record<string, GraphKeyboardCommand | null>> = {
    '0': createFitViewCommand(),
    Escape: createClearSelectionCommand(),
    Delete: deleteCommand,
    Backspace: options.isMod ? deleteCommand : null,
    F2: renameCommand,
    'a': options.isMod ? createSelectAllCommand(options.allNodeIds) : null,
  };

  return options.key === 'Enter'
    ? getEnterCommand(options.selectedNodeIds, options.isMod)
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
