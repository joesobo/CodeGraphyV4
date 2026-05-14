import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { hasExpandedOwnerSection } from '../../expandedOwnership';
import type { RectangleCollisionRect } from '../../model';
import { getNodeRectangleCollisionRect } from '../../rectangle/geometry/nodeRect';

export function isPassiveRootCircleNode(node: FGNode, graphLayout: GraphLayoutSettings): boolean {
	return !node.isGraphSection && !node.isDragging && !hasExpandedOwnerSection(node, graphLayout);
}

export function getPostIntegrationCircleRect(
	node: FGNode,
	velocityIntegrationDecay: number,
): RectangleCollisionRect | undefined {
	const rect = getNodeRectangleCollisionRect(node);
	if (!rect) {
		return undefined;
	}

	const centerX = rect.centerX + ((node.vx ?? 0) * velocityIntegrationDecay);
	const centerY = rect.centerY + ((node.vy ?? 0) * velocityIntegrationDecay);
	return {
		...rect,
		centerX,
		centerY,
		x: centerX - (rect.width / 2),
		y: centerY - (rect.height / 2),
	};
}
