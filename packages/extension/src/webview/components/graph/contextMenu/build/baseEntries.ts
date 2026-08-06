import { buildBackgroundEntries } from '../background/entries';
import type { BuildGraphContextMenuOptions, GraphContextMenuEntry } from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import { buildEdgeEntries } from '../edge/entries';
import { builtInItem } from '../common/entryFactories';
import { buildNodeEntries, buildSingleFolderNodeEntries, buildSinglePluginNodeEntries, buildSingleSymbolNodeEntries } from '../node/entries';

function nodeTargetIds(decision: Exclude<GraphContextMenuDecision, { kind: 'background' | 'edge' | 'emptyNodeSelection' | 'singleFolderNode' | 'singleSymbolNode' }>): readonly string[] {
  return 'target' in decision ? [decision.target.id] : decision.targets.map(target => target.id);
}

export function buildBaseGraphContextMenuEntries(decision: GraphContextMenuDecision, options: Pick<BuildGraphContextMenuOptions, 'favorites'>): GraphContextMenuEntry[] {
  if (decision.kind === 'background') return buildBackgroundEntries();
  if (decision.kind === 'singleFolderNode') return buildSingleFolderNodeEntries(decision.target, options.favorites);
  if (decision.kind === 'singleSymbolNode') return buildSingleSymbolNodeEntries(decision.target.id, options.favorites);
  if (decision.kind === 'singlePluginNode') return buildSinglePluginNodeEntries();
  if (decision.kind === 'edge') return buildEdgeEntries(decision.targets);
  if (decision.kind === 'emptyNodeSelection') return [];
  const entries = buildNodeEntries(nodeTargetIds(decision), options.favorites);
  if (decision.kind === 'multiFileNodes' && decision.targets.length === 2) {
    entries.splice(1, 0, builtInItem('node-compare-selected', 'Compare Selected', 'compare'));
  }
  return entries;
}
