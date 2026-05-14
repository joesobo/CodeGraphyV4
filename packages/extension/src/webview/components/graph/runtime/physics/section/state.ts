import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { isFiniteNumber } from '../numeric';

export function isExpandedGraphSection(node: FGNode): boolean {
	return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

export function hasExpandedGraphSection(graphLayout: GraphLayoutSettings): boolean {
	return Object.values(graphLayout.sections).some(section => !section.collapsed);
}

export function hasExpandedSectionCollisionSize(
	node: FGNode,
): node is FGNode & { sectionHeight: number; sectionWidth: number } {
	return !!node.isGraphSection
		&& !node.isCollapsedGraphSection
		&& isFiniteNumber(node.sectionHeight)
		&& isFiniteNumber(node.sectionWidth);
}
