import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import type { GraphSectionBoundsForceOptions } from '../../model';
import { addNodeVelocity, getNodeDelta } from '../../motion';
import { collectSectionMemberGroups } from './groups';
import { getSectionMemberRepelStrength } from './settings';
import { getMemberCollisionWeightShares } from './weights';

function applyMemberChargeForce(
	left: FGNode,
	right: FGNode,
	repelStrength: number,
	alpha: number,
): void {
	const weights = getMemberCollisionWeightShares(left, right);
	if (!weights || repelStrength === 0) {
		return;
	}

	const delta = getNodeDelta(left, right);
	const distanceSquared = Math.max(delta.x * delta.x + delta.y * delta.y, 1);
	const force = (repelStrength * alpha) / distanceSquared;
	addNodeVelocity(left, delta.x * force * weights.left, delta.y * force * weights.left);
	addNodeVelocity(right, -delta.x * force * weights.right, -delta.y * force * weights.right);
}

export function applySectionMemberChargeForces(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
	alpha: number,
): void {
	const repelStrength = getSectionMemberRepelStrength(settings);
	if (repelStrength === 0) {
		return;
	}

	for (const members of collectSectionMemberGroups(nodes, graphLayout).values()) {
		for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
			for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
				applyMemberChargeForce(members[leftIndex], members[rightIndex], repelStrength, alpha);
			}
		}
	}
}
