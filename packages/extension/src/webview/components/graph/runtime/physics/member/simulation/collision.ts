import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { applyMemberCircleCollision } from './circleCollision';
import { collectSectionMemberGroups } from './groups';

export function applySectionMemberCollisions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	for (const members of collectSectionMemberGroups(nodes, graphLayout).values()) {
		for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
			for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
				applyMemberCircleCollision(members[leftIndex], members[rightIndex], alpha);
			}
		}
	}
}
