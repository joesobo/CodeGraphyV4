import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { hasStrength } from '../../../../support/guards';
import type { GraphPhysicsControls } from '../../model';
import { getRootGraphCenterStrength } from '../collision';

export function applyCenterSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const strength = (node: FGNode): number => getRootGraphCenterStrength(node, settings.centerForce, graphLayout);
	const forceXInstance = graph.d3Force('forceX');
	if (hasStrength(forceXInstance)) forceXInstance.strength(strength);

	const forceYInstance = graph.d3Force('forceY');
	if (hasStrength(forceYInstance)) forceYInstance.strength(strength);
}

export function removeCentroidCenterForce(graph: GraphPhysicsControls): void {
	graph.d3Force('center', null);
}
