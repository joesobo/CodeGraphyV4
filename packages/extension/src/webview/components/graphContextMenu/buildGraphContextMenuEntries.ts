import { buildBackgroundEntries } from './backgroundEntries';
import { buildNodeEntries } from './nodeEntries';
import { buildPluginEntries } from './pluginEntries';
import type { BuildGraphContextMenuOptions, GraphContextMenuEntry } from './types';

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const { selection, timelineActive, favorites, pluginItems } = options;
  const baseEntries = selection.kind === 'background'
    ? buildBackgroundEntries(timelineActive)
    : buildNodeEntries(selection.targets, timelineActive, favorites);
  return [...baseEntries, ...buildPluginEntries(selection, pluginItems)];
}
