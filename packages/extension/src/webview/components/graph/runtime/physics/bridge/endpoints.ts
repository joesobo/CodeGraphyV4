import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphLinkEndpoint, GraphLinkLike } from '../model';
import { hasExpandedOwnerSectionById } from '../expandedOwnership';

export function getLinkEndpointId(endpoint: GraphLinkEndpoint): string | undefined {
	if (typeof endpoint === 'string') {
		return endpoint;
	}

	if (typeof endpoint === 'number') {
		return String(endpoint);
	}

	const id = endpoint?.id;
	return typeof id === 'number' ? String(id) : id;
}

export function getGraphLinkStrength(
	linkForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): (link: GraphLinkLike) => number {
	return (link: GraphLinkLike) => {
		const sourceId = getLinkEndpointId(link.source);
		const targetId = getLinkEndpointId(link.target);
		return hasExpandedOwnerSectionById(sourceId, graphLayout)
			|| hasExpandedOwnerSectionById(targetId, graphLayout)
			? 0
			: linkForce;
	};
}

export function getLinkEndpointNode(endpoint: FGLink['source'], nodeMap: Map<string, FGNode>): FGNode | undefined {
	return typeof endpoint === 'string'
		? nodeMap.get(endpoint)
		: endpoint;
}

export function getLinkNodePair(link: FGLink, nodeMap: Map<string, FGNode>): [FGNode, FGNode] | undefined {
	const source = getLinkEndpointNode(link.source, nodeMap);
	const target = getLinkEndpointNode(link.target, nodeMap);
	return source && target ? [source, target] : undefined;
}
