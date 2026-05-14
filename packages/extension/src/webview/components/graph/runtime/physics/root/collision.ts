import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { hasExpandedOwnerSection } from '../expandedOwnership';
import { COLLISION_PADDING } from '../model';
import { hasExpandedGraphSection, isExpandedGraphSection } from '../section/state';

export function getGraphCollisionRadius(node: FGNode): number {
	if (isExpandedGraphSection(node)) {
		return 0;
	}

	return (node.size ?? 0) + COLLISION_PADDING;
}

export function getRootGraphCollisionRadius(
	node: FGNode,
	graphLayout: GraphLayoutSettings | undefined,
): number {
	if (node.isDragging && graphLayout && hasExpandedGraphSection(graphLayout) && !node.isGraphSection) {
		return 0;
	}

	if (graphLayout && hasExpandedOwnerSection(node, graphLayout)) {
		return 0;
	}

	return getGraphCollisionRadius(node);
}

export function getRootGraphCenterStrength(
	node: FGNode,
	centerForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): number {
	if (graphLayout && hasExpandedOwnerSection(node, graphLayout)) {
		return 0;
	}

	return centerForce;
}
