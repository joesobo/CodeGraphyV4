import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../../shared/settings/physics';
import type { FGNode } from '../../../../model/build';
import {
	MIN_VELOCITY_INTEGRATION_DECAY,
	SECTION_RECTANGLE_MAX_REPEL_GAP,
	SECTION_RECTANGLE_REPEL_PADDING_RATIO,
	type GraphSectionBoundsForceOptions,
	type RectangleCollisionRect,
} from '../../model';
import { getNormalizedRepelScale } from '../../member/simulation/settings';
import { clamp } from '../../numeric';
import { isExpandedGraphSection } from '../../section/state';

export function getSectionRectangleRepelPadding(
	node: FGNode,
	rect: RectangleCollisionRect,
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	if (!isExpandedGraphSection(node)) {
		return 0;
	}

	const sizeAwarePadding = Math.min(rect.width, rect.height) * SECTION_RECTANGLE_REPEL_PADDING_RATIO;
	const maximumPadding = Math.max(SECTION_RECTANGLE_MAX_REPEL_GAP / 2, sizeAwarePadding);
	return getNormalizedRepelScale(settings) * maximumPadding;
}

export function inflateRectangleCollisionRect(
	rect: RectangleCollisionRect,
	padding: number,
): RectangleCollisionRect {
	if (padding <= 0) {
		return rect;
	}

	return {
		centerX: rect.centerX,
		centerY: rect.centerY,
		height: rect.height + padding * 2,
		width: rect.width + padding * 2,
		x: rect.x - padding,
		y: rect.y - padding,
	};
}

export function getRepelAwareCollisionRect(
	node: FGNode,
	rect: RectangleCollisionRect,
	settings: GraphSectionBoundsForceOptions['settings'],
): RectangleCollisionRect {
	return inflateRectangleCollisionRect(rect, getSectionRectangleRepelPadding(node, rect, settings));
}

export function getVelocityIntegrationDecay(settings: GraphSectionBoundsForceOptions['settings']): number {
	const damping = settings?.damping ?? DEFAULT_PHYSICS_SETTINGS.damping;
	return Math.max(MIN_VELOCITY_INTEGRATION_DECAY, 1 - clamp(damping, 0, 1));
}
