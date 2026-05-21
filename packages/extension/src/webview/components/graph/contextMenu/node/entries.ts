import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
import type { GraphContextNodeTarget } from '../decision/targets';
import { builtInItem, separator } from '../common/entryFactories';
import {
  buildOpenBlock,
  buildCopyBlock,
} from './openCopyBlocks';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';
import {
  buildDestructiveBlock,
  buildFilterBlock,
  buildFolderDestructiveBlock,
} from './destructive/block';

export function buildNodeEntries(
  targets: readonly string[],
  timelineActive: boolean,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  ];

  if (mutationAvailability !== 'hidden') {
    entries.push(...buildDestructiveBlock(targets, mutationAvailability === 'disabled'));
  }

  return entries;
}

export function buildSingleSymbolNodeEntries(
  target: string,
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const targets = [target];
  return [
    builtInItem('node-go-to-symbol', 'Go to Symbol', 'open'),
    builtInItem('node-reveal-symbol-file', 'Reveal File', 'reveal'),
    separator('node-separator-copy'),
    builtInItem('node-copy-symbol-id', 'Copy Symbol ID', 'copySymbolId'),
    builtInItem('node-copy-symbol-name', 'Copy Symbol Name', 'copySymbolName'),
    ...buildFavoriteBlock(targets, favorites),
    builtInItem('node-focus', 'Focus Node', 'focus'),
  ];
}

export function buildSinglePluginNodeEntries(): GraphContextMenuEntry[] {
  return [
    builtInItem('node-focus', 'Focus Node', 'focus'),
  ];
}

export function buildSingleFolderNodeEntries(
  target: GraphContextNodeTarget,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  const targets = [target.id];
  const entries: GraphContextMenuEntry[] = [];

  if (mutationAvailability !== 'hidden') {
    const disabled = mutationAvailability === 'disabled';
    entries.push(
      builtInItem('node-create-file', 'New File...', 'createFile', { disabled }),
      builtInItem('node-create-folder', 'New Folder...', 'createFolder', { disabled }),
      separator('node-separator-create'),
    );
  }

  entries.push(
    builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  );

  if (target.id !== '(root)' && mutationAvailability !== 'hidden') {
    entries.push(...buildFolderDestructiveBlock(mutationAvailability === 'disabled'));
  }

  return entries;
}
