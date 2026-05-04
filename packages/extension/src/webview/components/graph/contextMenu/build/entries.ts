import { buildBackgroundEntries } from '../background/entries';
import type { BuildGraphContextMenuOptions, GraphContextMenuEntry } from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildEdgeEntries } from '../edge/entries';
import { buildNodeEntries, buildSingleFolderNodeEntries } from '../node/entries';
import { buildPluginEntries } from '../plugin/entries';

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const { selection, timelineActive, favorites, pluginItems, nodes } = options;
  const mutationAvailability = options.mutationAvailability
    ?? (timelineActive ? 'hidden' : 'enabled');
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = decision.kind === 'background'
    ? buildBackgroundEntries(timelineActive)
    : decision.kind === 'singleFolderNode'
      ? buildSingleFolderNodeEntries(decision.target, mutationAvailability, favorites)
      : decision.kind === 'node'
        ? buildNodeEntries(decision.targets, timelineActive, favorites)
        : buildEdgeEntries(decision.targets);
  return [...baseEntries, ...buildPluginEntries(selection, pluginItems)];
}
