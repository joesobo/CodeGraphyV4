import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import { toD3Repel, type FGNode } from '../../../../model/build';
import { hasDistanceMax, hasStrength } from '../../../../support/guards';
import { hasExpandedOwnerSection } from '../../expandedOwnership';
import { DEFAULT_CHARGE_RANGE, type GraphPhysicsControls } from '../../model';
import { getSectionChargeMultiplier } from '../../section/charge';

function getGraphChargeStrength(
	repelForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): (node: FGNode) => number {
	const defaultStrength = toD3Repel(repelForce);
	return (node: FGNode) => node.isDragging || (graphLayout && hasExpandedOwnerSection(node, graphLayout))
		? 0
		: defaultStrength * getSectionChargeMultiplier(node);
}

export function applyChargeSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const chargeForce = graph.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(getGraphChargeStrength(settings.repelForce, graphLayout));
	if (hasDistanceMax(chargeForce)) {
		chargeForce.distanceMax(DEFAULT_CHARGE_RANGE);
	}
}
