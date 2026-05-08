import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
import { builtInItem, separator } from '../common/entryFactories';
import {
  buildOpenBlock,
  buildCopyBlock,
} from './openCopyBlocks';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';
import { buildPinBlock } from './pin/block';
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
  pinnedNodeIds: ReadonlySet<string> = new Set(),
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...(mutationAvailability === 'enabled' ? buildPinBlock(targets, pinnedNodeIds) : []),
    ...buildFilterBlock(targets),
  ];

  if (mutationAvailability !== 'hidden' && targets.length > 0) {
    entries.push(
      builtInItem('node-create-section-from-selection', 'Create Graph Section from Selection', 'createGraphSection', {
        disabled: mutationAvailability === 'disabled',
      }),
      separator('node-separator-section'),
    );
  }

  if (mutationAvailability !== 'hidden') {
    entries.push(...buildDestructiveBlock(targets, mutationAvailability === 'disabled'));
  }

  return entries;
}

export function buildSingleFolderNodeEntries(
  target: string,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
  pinnedNodeIds: ReadonlySet<string> = new Set(),
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
    ...(mutationAvailability === 'enabled' ? buildPinBlock(targets, pinnedNodeIds) : []),
    ...buildFilterBlock(targets),
  );

  if (mutationAvailability !== 'hidden') {
    entries.push(
      builtInItem('node-create-section-from-selection', 'Create Graph Section from Selection', 'createGraphSection', {
        disabled: mutationAvailability === 'disabled',
      }),
      separator('node-separator-section'),
    );
  }

  if (target !== '(root)' && mutationAvailability !== 'hidden') {
    entries.push(...buildFolderDestructiveBlock(mutationAvailability === 'disabled'));
  }

  return entries;
}

export function buildSingleGraphSectionNodeEntries(
  target: string,
  collapsed: boolean,
  mutationAvailability: GraphContextMutationAvailability,
  pinnedNodeIds: ReadonlySet<string> = new Set(),
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    builtInItem(
      'graph-section-toggle-collapse',
      collapsed ? 'Expand Graph Section' : 'Collapse Graph Section',
      collapsed ? 'expandGraphSection' : 'collapseGraphSection',
      { disabled: mutationAvailability === 'disabled' },
    ),
    builtInItem('node-focus', 'Focus Node', 'focus'),
  ];

  if (mutationAvailability === 'enabled') {
    entries.push(...buildPinBlock([target], pinnedNodeIds));
  }

  return entries;
}
