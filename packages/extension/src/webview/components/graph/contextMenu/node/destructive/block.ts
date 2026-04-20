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
    builtInItem('node-add-filter', isMultiSelect ? 'Add All to Filter' : 'Add to Filter', 'addToFilter'),
  ];

  if (!isMultiSelect) {
    entries.push(builtInItem('node-add-legend', 'Add Legend Group', 'addNodeLegend'));
  }

  return entries;
}

/** Builds file-changing actions hidden in timeline mode. */
export function buildDestructiveBlock(targets: readonly string[]): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [separator('node-separator-destructive')];

  if (!isMultiSelect) {
    entries.push(builtInItem('node-rename', 'Rename...', 'rename'));
  }

  entries.push(
    builtInItem('node-delete', isMultiSelect ? `Delete ${targets.length} Files` : 'Delete File', 'delete', {
      destructive: true,
    })
  );

  return entries;
}
