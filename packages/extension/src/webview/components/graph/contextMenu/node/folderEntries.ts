import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
import type { GraphContextNodeTarget } from '../decision/targets';
import { builtInItem, separator } from '../common/entryFactories';
import { buildCopyBlock } from './openCopyBlocks';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';
import {
  buildFilterBlock,
  buildFolderDestructiveBlock,
} from './destructive/block';
import { buildNodeClipboardEntries } from './clipboardEntries';

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
      builtInItem('node-create-file', 'New File', 'createFile', { disabled }),
      builtInItem('node-create-folder', 'New Folder', 'createFolder', { disabled }),
      separator('node-separator-create'),
    );
  }

  entries.push(
    builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'),
    ...buildNodeClipboardEntries(target.id === '(root)' ? [] : targets, mutationAvailability, true),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  );

  if (target.id !== '(root)') {
    entries.push(builtInItem('node-find-in-folder', 'Find in Folder…', 'findInFolder'));
  }

  if (target.id !== '(root)' && mutationAvailability !== 'hidden') {
    entries.push(...buildFolderDestructiveBlock(mutationAvailability === 'disabled'));
  }

  return entries;
}
