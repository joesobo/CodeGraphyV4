import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry } from '../contracts';

export { buildDestructiveBlock } from './destructiveBlock';

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
