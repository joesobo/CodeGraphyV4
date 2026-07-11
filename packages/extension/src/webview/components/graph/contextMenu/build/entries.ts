import { buildBackgroundEntries } from '../background/entries';
import {
  DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY,
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

  const pasteIndex = baseEntries.findIndex(entry => entry.id === 'background-paste-files');
  const separatorIndex = baseEntries.findIndex(entry => entry.id === 'background-separator-primary');
  const insertionIndex = pasteIndex === -1 ? separatorIndex : pasteIndex;
  if (insertionIndex === -1) {
    return [...baseEntries, ...createEntries];
  }

  return [
    ...baseEntries.slice(0, insertionIndex),
    ...createEntries,
    ...baseEntries.slice(insertionIndex),
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

function supportsFileClipboard(decision: GraphContextMenuDecision): boolean {
  if (
    decision.kind === 'singleFileNode'
    || decision.kind === 'multiFileNodes'
    || decision.kind === 'multiFolderNodes'
  ) {
    return true;
  }

  return decision.kind === 'mixedNodeSelection'
    && decision.targets.every(target => target.nodeKind === 'file' || target.nodeKind === 'folder');
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
  options: Pick<
    BuildGraphContextMenuOptions,
    'favorites' | 'mutationAvailability' | 'timelineActive'
  >,
): GraphContextMenuEntry[] {
  const mutationAvailability = options.mutationAvailability ?? DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY;
  if (decision.kind === 'background') {
    return buildBackgroundEntries(mutationAvailability);
  }
  if (decision.kind === 'singleFolderNode') {
    return buildSingleFolderNodeEntries(decision.target, mutationAvailability, options.favorites);
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
    options.timelineActive,
    mutationAvailability,
    options.favorites,
    supportsFileClipboard(decision),
  );
}

export function buildGraphContextMenuEntries(
  options: BuildGraphContextMenuOptions
): GraphContextMenuEntry[] {
  const {
    selection,
    graphMode = '2d',
    timelineActive,
    favorites,
    pluginItems,
    graphViewContributions,
    nodes,
    edges,
  } = options;
  const decision = decideGraphContextMenu(selection, nodes);
  const baseEntries = buildBaseGraphContextMenuEntries(decision, {
    favorites,
    mutationAvailability: options.mutationAvailability,
    timelineActive,
  });
  const graphViewCreateEntries = decision.kind === 'background'
    ? buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphMode,
      graphViewContributions,
      includeSeparator: false,
      nodes,
      placement: 'create',
      selection,
      timelineActive,
    })
    : [];
  const positionedBaseEntries = insertCreateMenuEntries(baseEntries, graphViewCreateEntries);
  return captureContextSelection([
    ...positionedBaseEntries,
    ...buildPluginEntriesForDecision(decision, pluginItems),
    ...buildGraphViewContextMenuEntries({
      decision,
      edges,
      graphMode,
      graphViewContributions,
      nodes,
      selection,
      timelineActive,
    }),
  ], selection);
}
