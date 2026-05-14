import { toD3Repel } from '../../../../model/build';
import {
	COLLISION_PADDING,
	MAX_NORMALIZED_REPEL_FORCE,
	SECTION_MEMBER_CENTER_STRENGTH,
	type GraphSectionBoundsForceOptions,
} from '../../model';
import { clamp } from '../../numeric';

export function getMemberCollisionRadius(node: { size?: number }): number {
	return Math.max(1, node.size ?? 1) + COLLISION_PADDING;
}

export function getSectionMemberCenterStrength(
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	return settings?.centerForce ?? SECTION_MEMBER_CENTER_STRENGTH;
}

export function getSectionMemberRepelStrength(
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	return settings ? toD3Repel(settings.repelForce) : 0;
}

export function getNormalizedRepelScale(settings: GraphSectionBoundsForceOptions['settings']): number {
	const normalizedRepel = clamp(settings?.repelForce ?? 0, 0, MAX_NORMALIZED_REPEL_FORCE);
	return normalizedRepel / MAX_NORMALIZED_REPEL_FORCE;
}
