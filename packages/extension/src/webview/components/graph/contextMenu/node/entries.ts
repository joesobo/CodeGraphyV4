import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
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
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  ];

  if (!timelineActive) {
    entries.push(...buildDestructiveBlock(targets));
  }

  return entries;
}

export function buildSingleFolderNodeEntries(
  target: string,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const targets = [target];
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

  if (target !== '(root)' && mutationAvailability !== 'hidden') {
    entries.push(...buildFolderDestructiveBlock(mutationAvailability === 'disabled'));
  }

  return entries;
}
