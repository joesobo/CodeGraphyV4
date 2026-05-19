import { buildBackgroundEntries } from '../background/entries';
import {
  DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY,
  type BuildGraphContextMenuOptions,
  type GraphContextMenuEntry,
} from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildEdgeEntries } from '../edge/entries';
import {
  buildNodeEntries,
  buildSingleFolderNodeEntries,
  buildSingleGraphSectionNodeEntries,
  buildSingleSymbolNodeEntries,
} from '../node/entries';
import { buildGraphViewContextMenuEntries } from '../graphView/entries';
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
  const {
    selection,
    timelineActive,
    favorites,
    pinnedNodeIds = new Set<string>(),
    pluginItems,
    graphViewContributions,
    nodes,
    edges,
  } = options;
  const mutationAvailability = options.mutationAvailability ?? DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY;
  const graphSectionsAvailable = options.graphSectionsAvailable ?? true;
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = decision.kind === 'background'
    ? buildBackgroundEntries(mutationAvailability, {
      includeGraphSection: graphSectionsAvailable,
    })
    : decision.kind === 'singleFolderNode'
      ? buildSingleFolderNodeEntries(
        decision.target,
        timelineActive,
        mutationAvailability,
        favorites,
        pinnedNodeIds,
      )
      : decision.kind === 'singleGraphSectionNode'
        ? buildSingleGraphSectionNodeEntries(
          decision.target.id,
          !!decision.target.isCollapsedGraphSection,
          mutationAvailability,
          pinnedNodeIds,
          {
            includeGraphSection: graphSectionsAvailable,
          },
        )
        : decision.kind === 'singleSymbolNode'
          ? buildSingleSymbolNodeEntries(decision.target.id, favorites)
          : decision.kind === 'edge'
            ? buildEdgeEntries(decision.targets)
            : decision.kind === 'emptyNodeSelection'
              ? []
              : buildNodeEntries(
                getNodeTargetIds(decision),
                timelineActive,
                mutationAvailability,
                favorites,
                pinnedNodeIds,
                {
                  includeGraphSection: graphSectionsAvailable,
                },
              );
  return [
    ...baseEntries,
    ...buildPluginEntriesForDecision(decision, pluginItems),
    ...buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      selection,
    }),
  ];
}
