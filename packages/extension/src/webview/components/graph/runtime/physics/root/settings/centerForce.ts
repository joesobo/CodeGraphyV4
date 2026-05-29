import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import { hasStrength } from '../../../../support/guards';
import type { GraphPhysicsControls } from '../../model';
import { getRootGraphCenterStrength } from '../collision';

export function applyCenterSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
): void {
	const strength = (): number => getRootGraphCenterStrength(settings.centerForce);
	const forceXInstance = graph.d3Force('forceX');
	if (hasStrength(forceXInstance)) forceXInstance.strength(strength);

	const forceYInstance = graph.d3Force('forceY');
	if (hasStrength(forceYInstance)) forceYInstance.strength(strength);
}

export function removeCentroidCenterForce(graph: GraphPhysicsControls): void {
	graph.d3Force('center', null);
}
