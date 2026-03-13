import type { GraphContextMenuEntry } from './types';

export function buildNodeEntries(
  targets: readonly string[],
  timelineActive: boolean,
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const isMultiSelect = targets.length > 1;
  const allFavorited = targets.length > 0 && targets.every(id => favorites.has(id));

  entries.push({
    kind: 'item',
    id: 'node-open',
    label: isMultiSelect ? `Open ${targets.length} Files` : 'Open File',
    action: { kind: 'builtin', action: 'open' },
  });

  if (!isMultiSelect && !timelineActive) {
    entries.push({
      kind: 'item',
      id: 'node-reveal',
      label: 'Reveal in Explorer',
      action: { kind: 'builtin', action: 'reveal' },
    });
  }

  entries.push({ kind: 'separator', id: 'node-separator-copy' });
  entries.push({
    kind: 'item',
    id: 'node-copy-relative',
    label: isMultiSelect ? 'Copy Relative Paths' : 'Copy Relative Path',
    action: { kind: 'builtin', action: 'copyRelative' },
  });

  if (!isMultiSelect) {
    entries.push({
      kind: 'item',
      id: 'node-copy-absolute',
      label: 'Copy Absolute Path',
      action: { kind: 'builtin', action: 'copyAbsolute' },
    });
  }

  entries.push({ kind: 'separator', id: 'node-separator-favorites' });
  entries.push({
    kind: 'item',
    id: 'node-toggle-favorite',
    label: allFavorited
      ? (isMultiSelect ? 'Remove All from Favorites' : 'Remove from Favorites')
      : (isMultiSelect ? 'Add All to Favorites' : 'Add to Favorites'),
    action: { kind: 'builtin', action: 'toggleFavorite' },
  });

  if (!isMultiSelect) {
    entries.push({
      kind: 'item',
      id: 'node-focus',
      label: 'Focus Node',
      action: { kind: 'builtin', action: 'focus' },
    });
  }

  if (!timelineActive) {
    entries.push({ kind: 'separator', id: 'node-separator-destructive-1' });
    entries.push({
      kind: 'item',
      id: 'node-add-exclude',
      label: isMultiSelect ? 'Add All to Exclude' : 'Add to Exclude',
      action: { kind: 'builtin', action: 'addToExclude' },
    });
    entries.push({ kind: 'separator', id: 'node-separator-destructive-2' });

    if (!isMultiSelect) {
      entries.push({
        kind: 'item',
        id: 'node-rename',
        label: 'Rename...',
        action: { kind: 'builtin', action: 'rename' },
      });
    }

    entries.push({
      kind: 'item',
      id: 'node-delete',
      label: isMultiSelect ? `Delete ${targets.length} Files` : 'Delete File',
      action: { kind: 'builtin', action: 'delete' },
      destructive: true,
    });
  }

  return entries;
}
