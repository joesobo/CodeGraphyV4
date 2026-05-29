import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import { toD3Repel, type FGNode } from '../../../../model/build';
import { hasDistanceMax, hasStrength } from '../../../../support/guards';
import { DEFAULT_CHARGE_RANGE, type GraphPhysicsControls } from '../../model';

function getGraphChargeStrength(repelForce: number): (node: FGNode) => number {
	const defaultStrength = toD3Repel(repelForce);
	return (node: FGNode) => {
		if (node.isDragging) {
			return 0;
		}

		const multiplier = node.chargeStrengthMultiplier2D;
		if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier < 0) {
			return defaultStrength;
		}

		return multiplier === 0 ? 0 : defaultStrength * multiplier;
	};
}

export function applyChargeSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
): void {
	const chargeForce = graph.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(getGraphChargeStrength(settings.repelForce));
	if (hasDistanceMax(chargeForce)) {
		chargeForce.distanceMax(DEFAULT_CHARGE_RANGE);
	}
}
