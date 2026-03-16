import { buildBackgroundEntries } from './backgroundEntries';
import { buildEdgeEntries } from './edgeEntries';
import { buildNodeEntries } from './nodeEntries';
import { buildPluginEntries } from './pluginEntries';
import type { BuildGraphContextMenuOptions, GraphContextMenuEntry } from './types';

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const { selection, timelineActive, favorites, pluginItems } = options;
  const baseEntries = selection.kind === 'background'
    ? buildBackgroundEntries(timelineActive)
    : selection.kind === 'node'
      ? buildNodeEntries(selection.targets, timelineActive, favorites)
      : buildEdgeEntries(selection.targets);
  return [...baseEntries, ...buildPluginEntries(selection, pluginItems)];
}
