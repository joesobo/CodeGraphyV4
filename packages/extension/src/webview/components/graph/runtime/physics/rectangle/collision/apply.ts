import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import type { GraphSectionBoundsForceOptions } from '../../model';
import { applyRectangleCollisionVelocity, getCollisionDirection } from './velocity';
import { isExpandedGraphSection } from '../../section/state';
import { getRectangleCollisionOverlap } from './overlap';

function applyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
): void {
	const overlap = getRectangleCollisionOverlap(left, right, graphLayout, settings);
	if (!overlap) {
		return;
	}

	if (overlap.overlapX <= overlap.overlapY) {
		const direction = getCollisionDirection(left, right, overlap.leftRect.centerX, overlap.rightRect.centerX);
		applyRectangleCollisionVelocity(left, right, overlap.leftRect, overlap.rightRect, 'x', direction, overlap.overlapX);
		return;
	}

	const direction = getCollisionDirection(left, right, overlap.leftRect.centerY, overlap.rightRect.centerY);
	applyRectangleCollisionVelocity(left, right, overlap.leftRect, overlap.rightRect, 'y', direction, overlap.overlapY);
}

export function applyRectangleCollisions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
): void {
	for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
		if (!isExpandedGraphSection(nodes[leftIndex])) {
			continue;
		}

		for (let rightIndex = 0; rightIndex < nodes.length; rightIndex += 1) {
			if (
				rightIndex === leftIndex
				|| (isExpandedGraphSection(nodes[rightIndex]) && rightIndex < leftIndex)
			) {
				continue;
			}

			applyRectangleCollision(nodes[leftIndex], nodes[rightIndex], graphLayout, settings);
		}
	}
}
