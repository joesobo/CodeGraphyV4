import { builtInItem, separator } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

export function buildNodeEntries(
  targets: readonly string[],
  timelineActive: boolean,
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const isMultiSelect = targets.length > 1;
  const allFavorited = targets.length > 0 && targets.every(id => favorites.has(id));

  entries.push(
    builtInItem('node-open', isMultiSelect ? `Open ${targets.length} Files` : 'Open File', 'open')
  );

  if (!isMultiSelect && !timelineActive) {
    entries.push(builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'));
  }

  entries.push(separator('node-separator-copy'));
  entries.push(
    builtInItem(
      'node-copy-relative',
      isMultiSelect ? 'Copy Relative Paths' : 'Copy Relative Path',
      'copyRelative'
    )
  );

  if (!isMultiSelect) {
    entries.push(builtInItem('node-copy-absolute', 'Copy Absolute Path', 'copyAbsolute'));
  }

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

  if (!timelineActive) {
    entries.push(separator('node-separator-destructive-1'));
    entries.push(
      builtInItem('node-add-exclude', isMultiSelect ? 'Add All to Exclude' : 'Add to Exclude', 'addToExclude')
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
  }

  return entries;
}
