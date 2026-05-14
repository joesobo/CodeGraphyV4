import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { SECTION_FRAME_HEADER_HEIGHT } from '../../../sectionFrames/model';
import type { BoundsRect, SectionCenter } from '../model';
import { createNodeMap } from '../nodeLookup';
import { isFiniteNumber } from '../numeric';

export function getSectionBounds(
	sectionNode: FGNode | undefined,
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): BoundsRect | undefined {
	const section = graphLayout.sections[sectionId];
	if (!section || section.collapsed) {
		return undefined;
	}

	const height = isFiniteNumber(sectionNode?.sectionHeight) ? sectionNode.sectionHeight : section.height;
	const width = isFiniteNumber(sectionNode?.sectionWidth) ? sectionNode.sectionWidth : section.width;
	const centerX = sectionNode?.x;
	const centerY = sectionNode?.y;
	return {
		height,
		width,
		x: isFiniteNumber(centerX) ? centerX - (width / 2) : section.x,
		y: isFiniteNumber(centerY) ? centerY - (height / 2) : section.y,
	};
}

export function getSectionMemberBounds(bounds: BoundsRect): BoundsRect {
	return {
		height: Math.max(1, bounds.height - SECTION_FRAME_HEADER_HEIGHT),
		width: bounds.width,
		x: bounds.x,
		y: bounds.y + SECTION_FRAME_HEADER_HEIGHT,
	};
}

export function createSectionBoundsMap(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
): Map<string, BoundsRect> {
	const nodeMap = createNodeMap(nodes);
	const bounds = new Map<string, BoundsRect>();

	for (const sectionId of Object.keys(graphLayout.sections)) {
		const sectionBounds = getSectionBounds(nodeMap.get(sectionId), sectionId, graphLayout);
		if (sectionBounds) {
			bounds.set(sectionId, sectionBounds);
		}
	}

	return bounds;
}

export function getSectionCenter(node: FGNode | undefined): SectionCenter | undefined {
	if (!node || !isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
		return undefined;
	}

	return { x: node.x, y: node.y };
}
