import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { filterEdgesToNodes, getDisabledTypes } from './model';
import {
  getDisabledNodeTypes,
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeDisabled';
import { nodeMatchesScope } from './scopeMatch';

function getEdgeContainingFileKey(
  edge: IGraphData['edges'][number],
  nodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
): string {
  const fromNode = nodeById.get(edge.from);
  const toNode = nodeById.get(edge.to);
  const fromFile = fromNode?.symbol?.filePath ?? edge.from;
  const toFile = toNode?.symbol?.filePath ?? edge.to;

  return `${edge.kind}\0${fromFile}\0${toFile}`;
}

function keepMostSpecificUniqueEdges(
  nodes: IGraphData['nodes'],
  edges: IGraphData['edges'],
): IGraphData['edges'] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const maxEndpointSpecificityByKey = new Map<string, number>();

  for (const edge of edges) {
    if (edge.kind === 'contains') {
      continue;
    }

    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    const key = getEdgeContainingFileKey(edge, nodeById);
    const specificity = Number(Boolean(fromNode?.symbol)) + Number(Boolean(toNode?.symbol));
    maxEndpointSpecificityByKey.set(
      key,
      Math.max(maxEndpointSpecificityByKey.get(key) ?? 0, specificity),
    );
  }

  const seenEdgeIds = new Set<string>();
  return edges.filter((edge) => {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    const key = getEdgeContainingFileKey(edge, nodeById);
    const specificity = Number(Boolean(fromNode?.symbol)) + Number(Boolean(toNode?.symbol));
    if (edge.kind !== 'contains' && specificity !== (maxEndpointSpecificityByKey.get(key) ?? specificity)) {
      return false;
    }

    if (seenEdgeIds.has(edge.id)) {
      return false;
    }

    seenEdgeIds.add(edge.id);
    return true;
  });
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const disabledSymbolKinds = getDisabledSymbolKinds(scope);
  const disabledScopedSymbolDefinitions = getDisabledScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    disabledSymbolKinds,
    disabledScopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));
  const edges = keepMostSpecificUniqueEdges(
    nodes,
    filterEdgesToNodes(scopedEdges, nodes),
  );
  return {
    nodes,
    edges: filterEdgesToNodes(edges, nodes),
  };
}
