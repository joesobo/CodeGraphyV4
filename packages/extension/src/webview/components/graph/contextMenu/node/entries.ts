import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
import type { GraphContextNodeTarget } from '../decision/targets';
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
  options: { includeGraphSection?: boolean; includePin?: boolean } = {},
): GraphContextMenuEntry[] {
  const includePin = options.includePin !== false;
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...(includePin && mutationAvailability === 'enabled' && !timelineActive
      ? buildPinBlock(targets, pinnedNodeIds)
      : []),
    ...buildFilterBlock(targets),
  ];

  if (mutationAvailability !== 'hidden' && targets.length > 0 && options.includeGraphSection !== false) {
    entries.push(
      builtInItem('node-create-section-from-selection', 'Wrap Selected in Graph Section', 'createGraphSection', {
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

export function buildSingleFolderNodeEntries(
  target: GraphContextNodeTarget,
  timelineActive: boolean,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
  pinnedNodeIds: ReadonlySet<string> = new Set(),
  options: { includePin?: boolean } = {},
): GraphContextMenuEntry[] {
  const targets = [target.id];
  const entries: GraphContextMenuEntry[] = [];
  const includePin = options.includePin !== false;

  if (mutationAvailability !== 'hidden') {
    const disabled = mutationAvailability === 'disabled';
    entries.push(
      builtInItem('node-create-file', 'New File...', 'createFile', { disabled }),
      builtInItem('node-create-folder', 'New Folder...', 'createFolder', { disabled }),
      separator('node-separator-create'),
    );
  }

  entries.push(
    builtInItem(
      'node-collapse-toggle',
      target.isCollapsed ? 'Expand Folder' : 'Collapse Folder',
      target.isCollapsed ? 'expandNode' : 'collapseNode',
    ),
    builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...(includePin && mutationAvailability === 'enabled' && !timelineActive
      ? buildPinBlock(targets, pinnedNodeIds)
      : []),
    ...buildFilterBlock(targets),
  );

  if (target.id !== '(root)' && mutationAvailability !== 'hidden') {
    entries.push(...buildFolderDestructiveBlock(mutationAvailability === 'disabled'));
  }

  return entries;
}

export function buildSingleGraphSectionNodeEntries(
  target: string,
  collapsed: boolean,
  mutationAvailability: GraphContextMutationAvailability,
  pinnedNodeIds: ReadonlySet<string> = new Set(),
  options: { includeGraphSection?: boolean; includePin?: boolean } = {},
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const includePin = options.includePin !== false;

  if (mutationAvailability !== 'hidden') {
    const disabled = mutationAvailability === 'disabled';
    entries.push(
      builtInItem('node-create-file', 'New File...', 'createFile', { disabled }),
      builtInItem('node-create-folder', 'New Folder...', 'createFolder', { disabled }),
      ...(options.includeGraphSection === false
        ? []
        : [builtInItem('node-create-graph-section', 'New Graph Section', 'createGraphSection', { disabled })]),
      separator('node-separator-create'),
    );
  }

  entries.push(
    builtInItem(
      'graph-section-toggle-collapse',
      collapsed ? 'Expand Graph Section' : 'Collapse Graph Section',
      collapsed ? 'expandGraphSection' : 'collapseGraphSection',
      { disabled: mutationAvailability === 'disabled' },
    ),
    builtInItem('node-focus', 'Focus Node', 'focus'),
  );

  if (includePin && mutationAvailability === 'enabled') {
    entries.push(...buildPinBlock([target], pinnedNodeIds));
  }

  if (mutationAvailability !== 'hidden') {
    entries.push(
      builtInItem('graph-section-delete', 'Delete Graph Section', 'deleteGraphSection', {
        destructive: true,
        disabled: mutationAvailability === 'disabled',
      }),
    );
  }

  return entries;
}
