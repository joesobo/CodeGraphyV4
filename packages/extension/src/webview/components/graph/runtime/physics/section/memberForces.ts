import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { constrainMemberNode } from '../member/bounds/constrain';
import { applySectionMemberChargeForces } from '../member/simulation/charge';
import { applySectionMemberCollisions } from '../member/simulation/collision';
import type { BoundsRect, GraphSectionBoundsForceOptions } from '../model';
import { getOwnerSectionId } from '../ownership';

export function constrainSectionMembers(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	sectionBounds: Map<string, BoundsRect>,
	alpha: number,
	sectionMemberCenterStrength: number,
): void {
	for (const node of nodes) {
		const ownerSectionId = getOwnerSectionId(node, graphLayout);
		if (node.isDragging || !ownerSectionId) {
			continue;
		}

		const bounds = sectionBounds.get(ownerSectionId);
		if (bounds) {
			constrainMemberNode(node, bounds, alpha, sectionMemberCenterStrength);
		}
	}
}

export function applyLocalSectionMemberForces(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
	alpha: number,
): void {
	applySectionMemberChargeForces(nodes, graphLayout, settings, alpha);
	applySectionMemberCollisions(nodes, graphLayout, alpha);
}
