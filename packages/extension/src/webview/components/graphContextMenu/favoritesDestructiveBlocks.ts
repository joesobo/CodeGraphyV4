import { builtInItem, separator } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

/** Builds the "favorites" block: Toggle Favorite and optionally Focus Node. */
export function buildFavoriteBlock(
  targets: readonly string[],
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const allFavorited = targets.length > 0 && targets.every(id => favorites.has(id));
  const entries: GraphContextMenuEntry[] = [];

  entries.push(separator('node-separator-favorites'));
  entries.push(
    builtInItem(
      'node-toggle-favorite',
      allFavorited
        ? (isMultiSelect ? 'Remove All from Favorites' : 'Remove from Favorites')
        : (isMultiSelect ? 'Add All to Favorites' : 'Add to Favorites'),
      'toggleFavorite'
    )
  );

  if (!isMultiSelect) {
    entries.push(builtInItem('node-focus', 'Focus Node', 'focus'));
  }

  return entries;
}

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
