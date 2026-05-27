import type { GraphKeyboardCommand, GraphKeyboardOptions } from '../effects';
import {
  createClearSelectionCommand,
  createDeleteGraphSectionsCommand,
  createFitViewCommand,
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

function getEnterCommand(selectedNodeIds: readonly string[]): GraphKeyboardCommand | null {
  if (selectedNodeIds.length === 0) {
    return null;
  }

  return createOpenSelectedNodesCommand(
    selectedNodeIds.filter(nodeId => !isPackageNodeId(nodeId)),
  );
}

function getDeleteCommand(selectedGraphSectionIds: readonly string[]): GraphKeyboardCommand | null {
  return selectedGraphSectionIds.length === 0
    ? null
    : createDeleteGraphSectionsCommand([...selectedGraphSectionIds]);
}

function getShortcutCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null {
  return (
    getZoomShortcutCommand(options.key, options.isMod, options.graphMode) ??
    getHistoryShortcutCommand(options.key, options.isMod, options.shiftKey) ??
    getToolbarShortcutCommand(options.key, options.isMod)
  );
}

const DIRECT_KEY_COMMAND_BUILDERS = {
  '0': createFitViewCommand,
  Escape: createClearSelectionCommand,
} satisfies Record<string, () => GraphKeyboardCommand>;

function getStaticDirectKeyCommand(key: string): GraphKeyboardCommand | undefined {
  const createCommand = DIRECT_KEY_COMMAND_BUILDERS[key as keyof typeof DIRECT_KEY_COMMAND_BUILDERS];
  return createCommand?.();
}

function getSelectionDirectKeyCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null | undefined {
  switch (options.key) {
    case 'Enter':
      return getEnterCommand(options.selectedNodeIds);
    case 'Delete':
    case 'Backspace':
      return getDeleteCommand(options.selectedGraphSectionIds ?? []);
    case 'a':
      return options.isMod ? createSelectAllCommand(options.allNodeIds) : null;
    default:
      return undefined;
  }
}

function getDirectKeyCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null | undefined {
  return getStaticDirectKeyCommand(options.key) ?? getSelectionDirectKeyCommand(options);
}

export function getGraphKeyboardCommandImpl(
  options: GraphKeyboardOptions
): GraphKeyboardCommand | null {
  if (options.targetIsEditable) {
    return null;
  }

  const directCommand = getDirectKeyCommand(options);
  return directCommand === undefined ? getShortcutCommand(options) : directCommand;
}
