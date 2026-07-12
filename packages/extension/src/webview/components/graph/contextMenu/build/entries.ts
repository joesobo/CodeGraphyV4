import { buildBackgroundEntries } from '../background/entries';
import {
  type BuildGraphContextMenuOptions,
  type GraphContextMenuEntry,
  type GraphContextSelection,
} from '../contracts';
import { decideGraphContextMenu } from '../decision/model';
import { buildEdgeEntries } from '../edge/entries';
import {
  buildNodeEntries,
  buildSingleFolderNodeEntries,
  buildSinglePluginNodeEntries,
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

function insertCreateMenuEntries(
  baseEntries: GraphContextMenuEntry[],
  createEntries: GraphContextMenuEntry[],
): GraphContextMenuEntry[] {
  if (createEntries.length === 0) {
    return baseEntries;
  }

  const separatorIndex = baseEntries.findIndex(entry => entry.id === 'background-separator-primary');
  if (separatorIndex === -1) {
    return [...baseEntries, ...createEntries];
  }

  return [
    ...baseEntries.slice(0, separatorIndex),
    ...createEntries,
    ...baseEntries.slice(separatorIndex),
  ];
}

function captureContextSelection(
  entries: GraphContextMenuEntry[],
  selection: GraphContextSelection,
): GraphContextMenuEntry[] {
  const contextSelection = cloneContextSelection(selection);
  return entries.map(entry =>
    entry.kind === 'item' ? { ...entry, contextSelection } : entry
  );
}

function cloneContextSelection(selection: GraphContextSelection): GraphContextSelection {
  return {
    kind: selection.kind,
    targets: [...selection.targets],
    ...(selection.edgeId ? { edgeId: selection.edgeId } : {}),
    ...(selection.graphPosition ? { graphPosition: { ...selection.graphPosition } } : {}),
  };
}

function buildBaseGraphContextMenuEntries(
  decision: GraphContextMenuDecision,
  options: Pick<BuildGraphContextMenuOptions, 'favorites'>,
): GraphContextMenuEntry[] {
  if (decision.kind === 'background') {
    return buildBackgroundEntries();
  }
  if (decision.kind === 'singleFolderNode') {
    return buildSingleFolderNodeEntries(decision.target, options.favorites);
  }
  if (decision.kind === 'singleSymbolNode') {
    return buildSingleSymbolNodeEntries(decision.target.id, options.favorites);
  }
  if (decision.kind === 'singlePluginNode') {
    return buildSinglePluginNodeEntries();
  }
  if (decision.kind === 'edge') {
    return buildEdgeEntries(decision.targets);
  }
  if (decision.kind === 'emptyNodeSelection') {
    return [];
  }

  return buildNodeEntries(
    getNodeTargetIds(decision),
    options.favorites,
  );
}

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const {
    selection,
    favorites,
    pluginItems,
    graphViewContributions,
    nodes,
    edges,
  } = options;
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = buildBaseGraphContextMenuEntries(decision, { favorites });
  const graphViewCreateEntries = decision.kind === 'background'
    ? buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      includeSeparator: false,
      nodes,
      placement: 'create',
      selection,
    })
    : [];
  const positionedBaseEntries = insertCreateMenuEntries(baseEntries, graphViewCreateEntries);
  return captureContextSelection([
    ...positionedBaseEntries,
    ...buildPluginEntriesForDecision(decision, pluginItems),
    ...buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphViewContributions,
      nodes,
      selection,
    }),
  ], selection);
}
