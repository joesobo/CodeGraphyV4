import { buildBackgroundEntries } from '../background/entries';
import {
  DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY,
  type BuildGraphContextMenuOptions,
  type GraphContextMenuEntry,
} from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildEdgeEntries } from '../edge/entries';
import { buildNodeEntries, buildSingleFolderNodeEntries } from '../node/entries';
import { buildPluginEntriesForDecision } from '../plugin/entries';
import type { GraphContextMenuDecision } from '../decision/model';

function getNodeTargetIds(
  decision: Extract<GraphContextMenuDecision, {
    kind:
      | 'singleFileNode'
      | 'singlePackageNode'
      | 'singlePluginNode'
      | 'multiFileNodes'
      | 'multiFolderNodes'
      | 'multiPackageNodes'
      | 'mixedNodeSelection';
  }>
): readonly string[] {
  return 'target' in decision
    ? [decision.target.id]
    : decision.targets.map(target => target.id);
}

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const { selection, timelineActive, favorites, pluginItems, nodes } = options;
  const mutationAvailability = options.mutationAvailability ?? DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY;
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = decision.kind === 'background'
    ? buildBackgroundEntries(mutationAvailability)
    : decision.kind === 'singleFolderNode'
      ? buildSingleFolderNodeEntries(decision.target.id, mutationAvailability, favorites)
      : decision.kind === 'edge'
        ? buildEdgeEntries(decision.targets)
        : decision.kind === 'emptyNodeSelection'
          ? []
          : buildNodeEntries(getNodeTargetIds(decision), timelineActive, mutationAvailability, favorites);
  return [...baseEntries, ...buildPluginEntriesForDecision(decision, pluginItems)];
}
