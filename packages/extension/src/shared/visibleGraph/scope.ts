import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { filterEdgesToNodes, getDisabledTypes } from './model';
import { getScopedSymbolDefinitions } from './scope/definitions';
import { nodeMatchesScope } from './scope/nodes';

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
	const bestEndpointPreferenceByKey = new Map<string, number>();

  for (const edge of edges) {
    const key = getEdgeContainingFileKey(edge, nodeById);
    const endpointPreference = getEndpointPreference(edge, nodeById);
    const currentEndpointPreference = bestEndpointPreferenceByKey.get(key);
    bestEndpointPreferenceByKey.set(
      key,
      currentEndpointPreference === undefined
        ? endpointPreference
        : Math.max(currentEndpointPreference, endpointPreference),
    );
  }

	const seenEdgeIds = new Set<string>();
	return edges.filter((edge) => {
		const key = getEdgeContainingFileKey(edge, nodeById);
		const endpointPreference = getEndpointPreference(edge, nodeById);
		if (endpointPreference !== (bestEndpointPreferenceByKey.get(key) ?? endpointPreference)) {
			return false;
		}

		if (seenEdgeIds.has(edge.id)) {
			return false;
		}

		seenEdgeIds.add(edge.id);
		return true;
	});
}

function getEndpointPreference(
	edge: IGraphData['edges'][number],
	nodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
): number {
	const fromNode = nodeById.get(edge.from);
	const toNode = nodeById.get(edge.to);
	const endpointSpecificity = Number(Boolean(fromNode?.symbol)) + Number(Boolean(toNode?.symbol));
	if (edge.kind === 'type-import') {
		return -endpointSpecificity;
	}

	return endpointSpecificity;
}

function getEdgeKindSuffix(edge: IGraphData['edges'][number]): string {
	const marker = edge.id.lastIndexOf('#');
	return marker >= 0 ? edge.id.slice(marker) : `#${edge.kind}`;
}

function projectEdgeToVisibleNodes(
	edge: IGraphData['edges'][number],
	allNodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
	visibleNodeIds: ReadonlySet<string>,
): IGraphData['edges'][number] | undefined {
	if (edge.kind === 'contains') {
		return edge;
	}

	const from = projectEndpointToVisibleNode(edge.from, allNodeById, visibleNodeIds);
	const to = projectEndpointToVisibleNode(edge.to, allNodeById, visibleNodeIds);
	if (!from || !to) {
		return undefined;
	}

	if (from === edge.from && to === edge.to) {
		return edge;
	}

	if (from === to) {
		return undefined;
	}

	return {
		...edge,
		id: `${from}->${to}${getEdgeKindSuffix(edge)}`,
		from,
		to,
	};
}

function projectEndpointToVisibleNode(
	nodeId: string,
	allNodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
	visibleNodeIds: ReadonlySet<string>,
): string | undefined {
	if (visibleNodeIds.has(nodeId)) {
		return nodeId;
	}

	const containingFilePath = allNodeById.get(nodeId)?.symbol?.filePath;
	if (containingFilePath && visibleNodeIds.has(containingFilePath)) {
		return containingFilePath;
	}

	return undefined;
}

function projectEdgesToVisibleNodes(
	edges: IGraphData['edges'],
	graphNodes: IGraphData['nodes'],
	visibleNodes: IGraphData['nodes'],
): IGraphData['edges'] {
	const allNodeById = new Map(graphNodes.map((node) => [node.id, node]));
	const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

	return edges.flatMap((edge) => {
		const projectedEdge = projectEdgeToVisibleNodes(edge, allNodeById, visibleNodeIds);
		return projectedEdge ? [projectedEdge] : [];
	});
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  const scopedSymbolDefinitions = getScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    scopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));
	const edges = keepMostSpecificUniqueEdges(
		nodes,
		projectEdgesToVisibleNodes(scopedEdges, graphData.nodes, nodes),
	);
  return {
    nodes,
    edges: filterEdgesToNodes(edges, nodes),
  };
}
