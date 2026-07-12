import type { GraphContextMenuEntry } from '../contracts';
import type { GraphContextNodeTarget } from '../decision/targets';
import { builtInItem, separator } from '../common/entryFactories';
import { buildCopyBlock } from './openCopyBlocks';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';
import {
  buildFilterBlock,
  buildFolderDestructiveBlock,
} from './destructive/block';

export function buildSingleFolderNodeEntries(
  target: GraphContextNodeTarget,
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  const targets = [target.id];
  const entries: GraphContextMenuEntry[] = [
    builtInItem('node-create-file', 'New File', 'createFile', { disabled: false }),
    builtInItem('node-create-folder', 'New Folder', 'createFolder', { disabled: false }),
    separator('node-separator-create'),
    builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  ];

  if (target.id !== '(root)') {
    entries.push(...buildFolderDestructiveBlock());
  }

  return entries;
}
