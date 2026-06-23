import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../src/shared/graph/contracts';

export function node(id: string, nodeType = 'file'): IGraphNode {
	return {
		id,
		label: id.split('/').pop() ?? id,
		color: '#111111',
		nodeType,
	};
}

export function symbolNode(
	id: string,
	symbol: NonNullable<IGraphNode['symbol']>,
	nodeType = 'symbol',
): IGraphNode {
	return {
		...node(id, nodeType),
		symbol,
	};
}

export function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
	return {
		id: `${from}->${to}#${kind}`,
		from,
		to,
		kind,
		sources: [],
	};
}

export function ids(graphData: IGraphData): { nodes: string[]; edges: string[] } {
	return {
		nodes: graphData.nodes.map((item) => item.id),
		edges: graphData.edges.map((item) => item.id),
	};
}
