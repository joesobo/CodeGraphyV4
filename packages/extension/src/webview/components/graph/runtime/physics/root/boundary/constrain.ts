import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { addAxisVelocity } from '../../axisMotion';
import type { BoundsRect } from '../../model';
import { getSectionBoundaryCorrection } from './correction';
import { getPostIntegrationCircleRect, isPassiveRootCircleNode } from './postIntegration';

function constrainPassiveRootNodeOutsideSectionBounds(
	node: FGNode,
	sectionBounds: Iterable<BoundsRect>,
	velocityIntegrationDecay: number,
): void {
	for (const bounds of sectionBounds) {
		const circleRect = getPostIntegrationCircleRect(node, velocityIntegrationDecay);
		if (!circleRect) {
			return;
		}

		const correction = getSectionBoundaryCorrection(circleRect, bounds);
		if (!correction) {
			continue;
		}

		addAxisVelocity(node, correction.axis, correction.delta / velocityIntegrationDecay);
	}
}

export function constrainPassiveRootNodesOutsideSections(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	sectionBounds: Map<string, BoundsRect>,
	velocityIntegrationDecay: number,
): void {
	for (const node of nodes) {
		if (isPassiveRootCircleNode(node, graphLayout)) {
			constrainPassiveRootNodeOutsideSectionBounds(node, sectionBounds.values(), velocityIntegrationDecay);
		}
	}
}
