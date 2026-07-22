import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { GraphContextMenuEdge, GraphContextMenuEntry, GraphContextMenuNode, GraphContextSelection } from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import type { GraphViewContextMenuPlacement } from './model';
import { createRunContext } from './runContext';
import { selectorMatches } from './selectorMatching';

type Entry = ExtensionGraphViewContributionSet['contextMenu'][number];
interface Options { decision: GraphContextMenuDecision; edges?: readonly GraphContextMenuEdge[]; nodes?: readonly GraphContextMenuNode[]; placement: GraphViewContextMenuPlacement | 'default'; selection: GraphContextSelection }

export function buildGraphViewContributionEntry(entry: Entry, options: Options): GraphContextMenuEntry | null {
  if ((entry.contribution.placement?.menu ?? 'default') !== options.placement) return null;
  const selector = entry.contribution.targets.find(target => selectorMatches(target, options.decision, options.edges));
  if (!selector) return null;
  const context = createRunContext(selector, options.selection, options.nodes);
  if (entry.contribution.isVisible && !entry.contribution.isVisible(context)) return null;
  return { kind: 'item', id: `graph-view-plugin-${entry.pluginId}-${entry.contribution.id}`,
    label: entry.contribution.getLabel?.(context) ?? entry.contribution.label,
    action: { kind: 'graphViewPlugin', pluginId: entry.pluginId, contributionId: entry.contribution.id,
      context, run: nextContext => entry.contribution.run(nextContext) } };
}
