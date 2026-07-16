/**
 * @fileoverview Destructive action block for the node context menu.
 * @module webview/components/graph/contextMenu/node/destructive/block
 */

import { builtInItem, separator } from '../../common/entryFactories';
import type { GraphContextMenuEntry } from '../../contracts';
import { buildFolderDestructiveEntries } from './folderBlock';

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

export function buildDestructiveBlock(
  targets: readonly string[],
): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [separator('node-separator-destructive')];

  if (!isMultiSelect) {
    entries.push(builtInItem('node-rename', 'Rename', 'rename', { disabled: false }));
  }

  entries.push(
    builtInItem('node-delete', isMultiSelect ? `Delete ${targets.length} Files` : 'Delete File', 'delete', {
      destructive: true,
      disabled: false,
    })
  );

  return entries;
}

export function buildFolderDestructiveBlock(): GraphContextMenuEntry[] {
  return buildFolderDestructiveEntries();
}
