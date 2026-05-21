import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import { separator } from '../common/entryFactories';
import type {
  GraphContextMenuEdge,
  GraphContextMenuEntry,
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import type { GraphContextNodeTarget } from '../decision/targets';

type GraphViewContextMenuEntry = CoreGraphViewContributionSet['contextMenu'][number];
type GraphViewContextMenuContribution = GraphViewContextMenuEntry['contribution'];
type GraphViewContextMenuTargetSelector = GraphViewContextMenuContribution['targets'][number];
type GraphViewContextMenuPlacement = NonNullable<GraphViewContextMenuContribution['placement']>['menu'];

function getSingleNodeTarget(decision: GraphContextMenuDecision): GraphContextNodeTarget | undefined {
  return 'target' in decision ? decision.target : undefined;
}

function getNodeTargets(decision: GraphContextMenuDecision): readonly GraphContextNodeTarget[] {
  if ('target' in decision) {
    return [decision.target];
  }

  return 'targets' in decision && decision.kind !== 'edge'
    ? decision.targets
    : [];
}

function findEdge(
  edgeId: string | undefined,
  edges: readonly GraphContextMenuEdge[] | undefined,
): GraphContextMenuEdge | undefined {
  return edgeId ? edges?.find(edge => edge.id === edgeId) : undefined;
}

function listAllows<T extends string>(
  allowed: readonly T[] | undefined,
  value: string | undefined,
): boolean {
  return !allowed?.length || (!!value && (allowed as readonly string[]).includes(value));
}

function nodeMatches(
  node: GraphContextNodeTarget,
  selector: Extract<GraphViewContextMenuTargetSelector, { kind: 'node' | 'multiSelection' | 'runtimeNodeType' }>,
): boolean {
  if (selector.kind === 'runtimeNodeType') {
    return listAllows(selector.runtimeNodeTypes, node.runtimeNodeType);
  }

  return listAllows(selector.nodeTypes, node.nodeType) &&
    listAllows(selector.runtimeNodeTypes, node.runtimeNodeType);
}

function edgeMatches(
  edge: GraphContextMenuEdge | undefined,
  selector: Extract<GraphViewContextMenuTargetSelector, { kind: 'edge' | 'runtimeEdgeType' }>,
): boolean {
  if (!edge) {
    return false;
  }

  if (selector.kind === 'runtimeEdgeType') {
    return listAllows(selector.runtimeEdgeTypes, edge.runtimeEdgeType);
  }

  return listAllows(selector.edgeKinds, edge.kind) &&
    listAllows(selector.runtimeEdgeTypes, edge.runtimeEdgeType);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function createSelectedNodePositions(
  selection: GraphContextSelection,
  nodes: readonly GraphContextMenuNode[] | undefined,
): Readonly<Record<string, { x: number; y: number; z?: number }>> | undefined {
  if (selection.kind !== 'node' || !nodes?.length) {
    return undefined;
  }

  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const positions: Record<string, { x: number; y: number; z?: number }> = {};
  for (const nodeId of selection.targets) {
    const node = nodesById.get(nodeId);
    if (!isFiniteNumber(node?.x) || !isFiniteNumber(node.y)) {
      continue;
    }

    positions[nodeId] = isFiniteNumber(node.z)
      ? { x: node.x, y: node.y, z: node.z }
      : { x: node.x, y: node.y };
  }

  return Object.keys(positions).length > 0 ? positions : undefined;
}

function selectorMatches(
  selector: GraphViewContextMenuTargetSelector,
  decision: GraphContextMenuDecision,
  edges: readonly GraphContextMenuEdge[] | undefined,
): boolean {
  if (selector.kind === 'background') {
    return decision.kind === 'background';
  }

  if (selector.kind === 'node' || selector.kind === 'runtimeNodeType') {
    const target = getSingleNodeTarget(decision);
    return !!target && nodeMatches(target, selector);
  }

  if (selector.kind === 'multiSelection') {
    const targets = getNodeTargets(decision);
    return targets.length > 1 && targets.every(target => nodeMatches(target, selector));
  }

  return decision.kind === 'edge' &&
    edgeMatches(findEdge(decision.edgeId, edges), selector);
}

function createRunContext(
  selector: GraphViewContextMenuTargetSelector,
  selection: GraphContextSelection,
  graphMode: '2d' | '3d',
  timelineActive: boolean,
  nodes: readonly GraphContextMenuNode[] | undefined,
): Parameters<GraphViewContextMenuContribution['run']>[0] {
  const selectedNodePositions = createSelectedNodePositions(selection, nodes);
  return {
    target: selector,
    graphMode,
    timelineActive,
    selectedNodeIds: selection.kind === 'node' ? selection.targets : [],
    selectedEdgeIds: selection.kind === 'edge' && selection.edgeId ? [selection.edgeId] : [],
    ...(selection.graphPosition ? { graphPosition: selection.graphPosition } : {}),
    ...(selectedNodePositions ? { selectedNodePositions } : {}),
  };
}

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
