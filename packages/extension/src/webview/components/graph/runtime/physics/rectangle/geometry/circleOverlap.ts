import type { FGNode } from '../../../../model/build';
import type { BoundsRect, RectangleCollisionRect } from '../../model';
import { clamp } from '../../numeric';
import { isExpandedGraphSection } from '../../section/state';

export function circleRectOverlapsRectangle(
	circleRect: RectangleCollisionRect,
	rectangle: BoundsRect,
): boolean {
	const radius = Math.min(circleRect.width, circleRect.height) / 2;
	if (radius <= 0) {
		return false;
	}

	const closestX = clamp(circleRect.centerX, rectangle.x, rectangle.x + rectangle.width);
	const closestY = clamp(circleRect.centerY, rectangle.y, rectangle.y + rectangle.height);
	const deltaX = circleRect.centerX - closestX;
	const deltaY = circleRect.centerY - closestY;
	return deltaX * deltaX + deltaY * deltaY < radius * radius;
}

export function hasActualCircleRectangleOverlap(
	left: FGNode,
	right: FGNode,
	leftRect: RectangleCollisionRect,
	rightRect: RectangleCollisionRect,
): boolean {
	if (isExpandedGraphSection(left) && !isExpandedGraphSection(right)) {
		return circleRectOverlapsRectangle(rightRect, leftRect);
	}

	if (isExpandedGraphSection(right) && !isExpandedGraphSection(left)) {
		return circleRectOverlapsRectangle(leftRect, rightRect);
	}

	return true;
}
