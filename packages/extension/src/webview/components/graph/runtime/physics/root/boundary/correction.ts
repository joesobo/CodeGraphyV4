import {
	SECTION_BOUNDARY_EPSILON,
	type BoundsRect,
	type CollisionAxis,
	type RectangleCollisionRect,
} from '../../model';
import { circleRectOverlapsRectangle } from '../../rectangle/geometry/circleOverlap';

export function getSectionBoundaryCorrection(
	circleRect: RectangleCollisionRect,
	sectionBounds: BoundsRect,
): { axis: CollisionAxis; delta: number } | undefined {
	const radius = Math.min(circleRect.width, circleRect.height) / 2;
	if (!circleRectOverlapsRectangle(circleRect, sectionBounds)) {
		return undefined;
	}

	const candidates = [
		{ axis: 'x' as const, delta: (sectionBounds.x - radius - SECTION_BOUNDARY_EPSILON) - circleRect.centerX },
		{ axis: 'x' as const, delta: (sectionBounds.x + sectionBounds.width + radius + SECTION_BOUNDARY_EPSILON) - circleRect.centerX },
		{ axis: 'y' as const, delta: (sectionBounds.y - radius - SECTION_BOUNDARY_EPSILON) - circleRect.centerY },
		{ axis: 'y' as const, delta: (sectionBounds.y + sectionBounds.height + radius + SECTION_BOUNDARY_EPSILON) - circleRect.centerY },
	].sort((left, right) => Math.abs(left.delta) - Math.abs(right.delta));
	return candidates[0];
}
