import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { FGNode } from '../../../../model/build';
import { COLLISION_ITERATIONS, type GraphPhysicsControls, type GraphPhysicsInstance, type GraphPhysicsOptions } from '../../model';
import { applyPhysicsSettings } from './apply';
import { removeCentroidCenterForce } from './centerForce';
import { getRootGraphCenterStrength, getRootGraphCollisionRadius } from '../collision';

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsOptions = {},
): void {
	const graph = instance as GraphPhysicsControls;
	applyPhysicsSettings(instance, settings, options);
	removeCentroidCenterForce(graph);
	graph.d3Force(
		'forceX',
		forceX<FGNode>(0).strength(() => getRootGraphCenterStrength(settings.centerForce)),
	);
	graph.d3Force(
		'forceY',
		forceY<FGNode>(0).strength(() => getRootGraphCenterStrength(settings.centerForce)),
	);
	graph.d3Force(
		'collision',
		forceCollide<FGNode>(node => getRootGraphCollisionRadius(node)).iterations(COLLISION_ITERATIONS),
	);
	graph.d3ReheatSimulation();
}
