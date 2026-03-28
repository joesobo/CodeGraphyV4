/**
 * @fileoverview Destructive action block for the node context menu.
 * @module webview/components/graphContextMenu/destructiveBlock
 */

import { builtInItem, separator } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

/** Builds the "destructive" block: Add to Filter, Rename, and Delete. */
export function buildDestructiveBlock(targets: readonly string[]): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [];

  entries.push(separator('node-separator-destructive-1'));
  entries.push(
    builtInItem('node-add-filter', isMultiSelect ? 'Add All to Filter' : 'Add to Filter', 'addToFilter')
  );
  entries.push(separator('node-separator-destructive-2'));

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
