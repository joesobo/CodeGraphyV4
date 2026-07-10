import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { separator } from '../common/entryFactories';
import type {
  GraphContextMenuEdge,
  GraphContextMenuEntry,
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import type { GraphViewContextMenuPlacement } from './model';
import { createRunContext } from './runContext';
import { selectorMatches } from './selectorMatching';

type BuildGraphViewContextMenuEntriesOptions = {
  decision: GraphContextMenuDecision;
  edges?: readonly GraphContextMenuEdge[];
  graphMode?: '2d' | '3d';
  graphViewContributions?: CoreGraphViewContributionSet;
  includeSeparator?: boolean;
  placement?: GraphViewContextMenuPlacement | 'default';
  nodes?: readonly GraphContextMenuNode[];
  selection: GraphContextSelection;
};

type GraphViewContextMenuContributionEntry =
  CoreGraphViewContributionSet['contextMenu'][number];

function graphViewContextMenuPlacementMatches(
  entry: GraphViewContextMenuContributionEntry,
  placement: GraphViewContextMenuPlacement | 'default',
): boolean {
  return (entry.contribution.placement?.menu ?? 'default') === placement;
}

function buildGraphViewContextMenuEntry(
  entry: GraphViewContextMenuContributionEntry,
  options: Required<Pick<BuildGraphViewContextMenuEntriesOptions, 'graphMode' | 'placement'>>
    & BuildGraphViewContextMenuEntriesOptions,
): GraphContextMenuEntry | null {
  if (!graphViewContextMenuPlacementMatches(entry, options.placement)) {
    return null;
  }

  const selector = entry.contribution.targets.find(target =>
    selectorMatches(target, options.decision, options.edges)
  );
  if (!selector) {
    return null;
  }

  const context = createRunContext(
    selector,
    options.selection,
    options.graphMode,
    options.nodes,
  );
  if (entry.contribution.isVisible && !entry.contribution.isVisible(context)) {
    return null;
  }

  return {
    kind: 'item',
    id: `graph-view-plugin-${entry.pluginId}-${entry.contribution.id}`,
    label: entry.contribution.getLabel?.(context) ?? entry.contribution.label,
    action: {
      kind: 'graphViewPlugin',
      pluginId: entry.pluginId,
      contributionId: entry.contribution.id,
      context,
      run: nextContext => entry.contribution.run(nextContext),
    },
  };
}

export function buildGraphViewContextMenuEntries(
  options: BuildGraphViewContextMenuEntriesOptions,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const placement = options.placement ?? 'default';
  const graphMode = options.graphMode ?? '2d';
  const resolvedOptions = { ...options, graphMode, placement };

  for (const entry of options.graphViewContributions?.contextMenu ?? []) {
    const menuEntry = buildGraphViewContextMenuEntry(entry, resolvedOptions);
    if (menuEntry) {
      entries.push(menuEntry);
    }
  }

  return entries.length > 0 && options.includeSeparator !== false
    ? [separator('graph-view-plugins-separator'), ...entries]
    : entries;
}
