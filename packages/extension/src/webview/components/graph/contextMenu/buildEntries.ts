import { buildBackgroundEntries } from './background/entries';
import { buildEdgeEntries } from './edge/entries';
import { buildNodeEntries } from './node/entries';
import { buildPluginEntries } from './plugin/entries';
import type { BuildGraphContextMenuOptions, GraphContextMenuEntry } from './contracts';

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
