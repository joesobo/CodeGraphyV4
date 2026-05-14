import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { hasExpandedOwnerSection } from '../../expandedOwnership';
import type { SectionCenter, SectionMemberPosition } from '../../model';
import { createNodeMap } from '../../nodeLookup';
import { isFiniteNumber } from '../../numeric';
import { getSectionCenter } from '../../section/bounds';

function isExpandedSectionMember(node: FGNode, graphLayout: GraphLayoutSettings): boolean {
	return !node.isGraphSection && hasExpandedOwnerSection(node, graphLayout);
}

function isolateSectionMemberVelocity(
	node: FGNode,
	previousSectionMemberPositions: Map<string, SectionMemberPosition>,
): void {
	if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
		node.vx = 0;
		node.vy = 0;
		return;
	}

	if (node.isDragging) {
		node.vx = 0;
		node.vy = 0;
		return;
	}

	const previousPosition = previousSectionMemberPositions.get(node.id);
	if (!previousPosition) {
		node.vx = 0;
		node.vy = 0;
		return;
	}

	node.vx = node.x - previousPosition.x;
	node.vy = node.y - previousPosition.y;
}

export function isolateSectionMemberVelocities(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionMemberPositions: Map<string, SectionMemberPosition>,
): void {
	for (const node of nodes) {
		if (isExpandedSectionMember(node, graphLayout)) {
			isolateSectionMemberVelocity(node, previousSectionMemberPositions);
		}
	}
}

export function rememberSectionCenters(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionCenters: Map<string, SectionCenter>,
): void {
	const nodeMap = createNodeMap(nodes);
	previousSectionCenters.clear();
	for (const sectionId of Object.keys(graphLayout.sections)) {
		const center = getSectionCenter(nodeMap.get(sectionId));
		if (center) {
			previousSectionCenters.set(sectionId, center);
		}
	}
}

export function rememberSectionMemberPositions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionMemberPositions: Map<string, SectionMemberPosition>,
): void {
	previousSectionMemberPositions.clear();
	for (const node of nodes) {
		if (isExpandedSectionMember(node, graphLayout) && isFiniteNumber(node.x) && isFiniteNumber(node.y)) {
			previousSectionMemberPositions.set(node.id, { x: node.x, y: node.y });
		}
	}
}
