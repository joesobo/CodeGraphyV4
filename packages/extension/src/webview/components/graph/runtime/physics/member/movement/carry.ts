import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import type { SectionCenter } from '../../model';
import { translateNodePosition } from '../../motion';
import { createNodeMap } from '../../nodeLookup';
import { getOwnerSectionId } from '../../ownership';
import { getSectionCenter } from '../../section/bounds';
import { getSectionIdsByDepth } from '../../section/hierarchy';

function getSectionCenterDelta(
	sectionId: string,
	nodeMap: Map<string, FGNode>,
	previousSectionCenters: Map<string, SectionCenter>,
): SectionCenter | undefined {
	const currentCenter = getSectionCenter(nodeMap.get(sectionId));
	const previousCenter = previousSectionCenters.get(sectionId);
	if (!currentCenter || !previousCenter) {
		return undefined;
	}

	const delta = {
		x: currentCenter.x - previousCenter.x,
		y: currentCenter.y - previousCenter.y,
	};
	return delta.x === 0 && delta.y === 0 ? undefined : delta;
}

function carryDirectSectionMembers(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	sectionId: string,
	delta: SectionCenter,
): void {
	for (const node of nodes) {
		if (node.id !== sectionId && getOwnerSectionId(node, graphLayout) === sectionId) {
			translateNodePosition(node, delta.x, delta.y);
		}
	}
}

export function carrySectionMembersWithFrames(
	nodes: FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionCenters: Map<string, SectionCenter>,
): void {
	const nodeMap = createNodeMap(nodes);
	for (const sectionId of getSectionIdsByDepth(graphLayout)) {
		const delta = getSectionCenterDelta(sectionId, nodeMap, previousSectionCenters);
		if (delta) carryDirectSectionMembers(nodes, graphLayout, sectionId, delta);
	}
}
