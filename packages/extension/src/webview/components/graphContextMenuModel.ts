import type { IPluginContextMenuItem } from '../../shared/types';

export type GraphContextTargetKind = 'background' | 'node';

export type BuiltInContextMenuAction =
  | 'open'
  | 'reveal'
  | 'copyRelative'
  | 'copyAbsolute'
  | 'toggleFavorite'
  | 'focus'
  | 'addToExclude'
  | 'rename'
  | 'delete'
  | 'refresh'
  | 'fitView'
  | 'createFile';

export type GraphContextMenuAction =
  | { kind: 'builtin'; action: BuiltInContextMenuAction }
  | { kind: 'plugin'; pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' };

export type GraphContextMenuEntry =
  | {
      kind: 'item';
      id: string;
      label: string;
      action: GraphContextMenuAction;
      destructive?: boolean;
      shortcut?: string;
    }
  | {
      kind: 'separator';
      id: string;
    };

export interface GraphContextSelection {
  kind: GraphContextTargetKind;
  targets: string[];
}

export interface BuildGraphContextMenuOptions {
  selection: GraphContextSelection;
  timelineActive: boolean;
  favorites: ReadonlySet<string>;
  pluginItems: readonly IPluginContextMenuItem[];
}

export function makeNodeContextSelection(
  nodeId: string,
  selectedNodes: ReadonlySet<string>
): GraphContextSelection {
  if (!selectedNodes.has(nodeId)) {
    return { kind: 'node', targets: [nodeId] };
  }
  return { kind: 'node', targets: [...selectedNodes] };
}

export function makeBackgroundContextSelection(): GraphContextSelection {
  return { kind: 'background', targets: [] };
}

function buildBackgroundEntries(timelineActive: boolean): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (!timelineActive) {
    entries.push({
      kind: 'item',
      id: 'background-create-file',
      label: 'New File...',
      action: { kind: 'builtin', action: 'createFile' },
    });
    entries.push({ kind: 'separator', id: 'background-separator-primary' });
  }
  entries.push(
    {
      kind: 'item',
      id: 'background-refresh',
      label: 'Refresh Graph',
      action: { kind: 'builtin', action: 'refresh' },
    },
    {
      kind: 'item',
      id: 'background-fit',
      label: 'Fit All Nodes',
      shortcut: '0',
      action: { kind: 'builtin', action: 'fitView' },
    }
  );
  return entries;
}

function buildNodeEntries(
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

function buildPluginEntries(
  selection: GraphContextSelection,
  pluginItems: readonly IPluginContextMenuItem[]
): GraphContextMenuEntry[] {
  if (selection.kind !== 'node' || selection.targets.length !== 1) return [];
  const targetId = selection.targets[0];
  const eligibleItems = pluginItems.filter(item => item.when === 'node' || item.when === 'both');
  if (eligibleItems.length === 0) return [];

  const entries: GraphContextMenuEntry[] = [{ kind: 'separator', id: 'plugins-separator' }];
  let previousGroup: string | undefined;

  for (let idx = 0; idx < eligibleItems.length; idx++) {
    const item = eligibleItems[idx];
    if (idx > 0 && item.group && previousGroup && item.group !== previousGroup) {
      entries.push({ kind: 'separator', id: `plugins-group-separator-${idx}` });
    }
    previousGroup = item.group;
    entries.push({
      kind: 'item',
      id: `plugin-${item.pluginId}-${item.index}`,
      label: item.label,
      action: {
        kind: 'plugin',
        pluginId: item.pluginId,
        index: item.index,
        targetId,
        targetType: 'node',
      },
    });
  }

  return entries;
}

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const { selection, timelineActive, favorites, pluginItems } = options;
  const baseEntries = selection.kind === 'background'
    ? buildBackgroundEntries(timelineActive)
    : buildNodeEntries(selection.targets, timelineActive, favorites);
  return [...baseEntries, ...buildPluginEntries(selection, pluginItems)];
}
