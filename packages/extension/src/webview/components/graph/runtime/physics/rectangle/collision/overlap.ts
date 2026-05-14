import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import type { GraphSectionBoundsForceOptions, RectangleCollisionOverlap } from '../../model';
import { shouldApplyRectangleCollision } from './eligibility';
import { hasActualCircleRectangleOverlap } from '../geometry/circleOverlap';
import { getNodeRectangleCollisionRect } from '../geometry/nodeRect';
import { getRepelAwareCollisionRect } from './repel';

export function getRectangleCollisionOverlap(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
): RectangleCollisionOverlap | undefined {
	if (!shouldApplyRectangleCollision(left, right, graphLayout)) {
		return undefined;
	}

	const leftRect = getNodeRectangleCollisionRect(left, true);
	const rightRect = getNodeRectangleCollisionRect(right, true);
	if (!leftRect || !rightRect || !hasActualCircleRectangleOverlap(left, right, leftRect, rightRect)) {
		return undefined;
	}

	const leftCollisionRect = getRepelAwareCollisionRect(left, leftRect, settings);
	const rightCollisionRect = getRepelAwareCollisionRect(right, rightRect, settings);
	const overlapX = Math.min(leftCollisionRect.x + leftCollisionRect.width, rightCollisionRect.x + rightCollisionRect.width)
		- Math.max(leftCollisionRect.x, rightCollisionRect.x);
	const overlapY = Math.min(leftCollisionRect.y + leftCollisionRect.height, rightCollisionRect.y + rightCollisionRect.height)
		- Math.max(leftCollisionRect.y, rightCollisionRect.y);
	return overlapX <= 0 || overlapY <= 0
		? undefined
		: { leftRect, overlapX, overlapY, rightRect };
}
