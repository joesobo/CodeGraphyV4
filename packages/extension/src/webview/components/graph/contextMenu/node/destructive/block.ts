/**
 * @fileoverview Destructive action block for the node context menu.
 * @module webview/components/graph/contextMenu/node/destructive/block
 */

import { builtInItem, separator } from '../../common/entryFactories';
import type { GraphContextMenuEntry } from '../../contracts';

export function buildFilterBlock(targets: readonly string[]): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [
    separator('node-separator-filter'),
    builtInItem(
      'node-add-filter',
      isMultiSelect ? 'Add Filter Patterns' : 'Add Filter Pattern',
      'addToFilter'
    ),
  ];

  if (!isMultiSelect) {
    entries.push(
      separator('node-separator-legend'),
      builtInItem('node-add-legend', 'Add Legend Group', 'addNodeLegend')
    );
  }

  return entries;
}

/** Builds file-changing actions controlled by Graph Revision mutability. */
export function buildDestructiveBlock(
  targets: readonly string[],
  disabled = false
): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [separator('node-separator-destructive')];

  entries.push(builtInItem('node-rename', 'Rename', 'rename', {
    disabled: disabled || isMultiSelect,
    disabledReason: isMultiSelect
      ? 'Select one file to rename.'
      : disabled ? 'Graph revisions are read-only.' : undefined,
  }));

  entries.push(
    builtInItem('node-delete', isMultiSelect ? `Delete ${targets.length} Files` : 'Delete File', 'delete', {
      destructive: true,
      disabled,
    })
  );

  return entries;
}

export function buildFolderDestructiveBlock(disabled: boolean): GraphContextMenuEntry[] {
  return [
    separator('node-separator-folder-destructive'),
    builtInItem('node-rename-folder', 'Rename Folder', 'rename', { disabled }),
    builtInItem('node-delete-folder', 'Delete Folder', 'delete', {
      destructive: true,
      disabled,
    }),
  ];
}
