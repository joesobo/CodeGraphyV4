import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import { separator } from '../common/entryFactories';
import type {
  GraphContextMenuEdge,
  GraphContextMenuEntry,
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import type { GraphViewContextMenuPlacement } from './model';
import { buildGraphViewContributionEntry } from './contributionEntry';

type BuildGraphViewContextMenuEntriesOptions = {
  decision: GraphContextMenuDecision;
  edges?: readonly GraphContextMenuEdge[];
  graphViewContributions?: ExtensionGraphViewContributionSet;
  includeSeparator?: boolean;
  placement?: GraphViewContextMenuPlacement | 'default';
  nodes?: readonly GraphContextMenuNode[];
  selection: GraphContextSelection;
};

export function buildGraphViewContextMenuEntries(
  options: BuildGraphViewContextMenuEntriesOptions,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  const placement = options.placement ?? 'default';
  const resolvedOptions = { ...options, placement };

  for (const entry of options.graphViewContributions?.contextMenu ?? []) {
    const menuEntry = buildGraphViewContributionEntry(entry, resolvedOptions);
    if (menuEntry) {
      entries.push(menuEntry);
    }
  }

  return entries.length > 0 && options.includeSeparator !== false
    ? [separator('graph-view-plugins-separator'), ...entries]
    : entries;
}
