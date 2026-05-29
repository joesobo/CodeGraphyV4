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

export function buildGraphViewContextMenuEntries(
  options: {
    decision: GraphContextMenuDecision;
    edges?: readonly GraphContextMenuEdge[];
    graphMode?: '2d' | '3d';
    graphViewContributions?: CoreGraphViewContributionSet;
    includeSeparator?: boolean;
    placement?: GraphViewContextMenuPlacement | 'default';
    nodes?: readonly GraphContextMenuNode[];
    selection: GraphContextSelection;
    timelineActive: boolean;
  },
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const placement = options.placement ?? 'default';
  const graphMode = options.graphMode ?? '2d';

  for (const entry of options.graphViewContributions?.contextMenu ?? []) {
    const contributionPlacement = entry.contribution.placement?.menu ?? 'default';
    if (contributionPlacement !== placement) {
      continue;
    }

    const selector = entry.contribution.targets.find(target =>
      selectorMatches(target, options.decision, options.edges)
    );
    if (!selector) {
      continue;
    }
    const context = createRunContext(
      selector,
      options.selection,
      graphMode,
      options.timelineActive,
      options.nodes,
    );
    if (entry.contribution.isVisible && !entry.contribution.isVisible(context)) {
      continue;
    }

    entries.push({
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
    });
  }

  return entries.length > 0 && options.includeSeparator !== false
    ? [separator('graph-view-plugins-separator'), ...entries]
    : entries;
}
