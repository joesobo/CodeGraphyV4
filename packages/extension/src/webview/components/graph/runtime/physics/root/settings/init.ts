import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { FGNode } from '../../../../model/build';
import { COLLISION_ITERATIONS, type GraphPhysicsControls, type GraphPhysicsInstance, type GraphPhysicsSectionOptions } from '../../model';
import { applyGraphSectionBoundsForce } from '../../section/binding';
import { applyPhysicsSettings } from './apply';
import { removeCentroidCenterForce } from './centerForce';
import { getRootGraphCenterStrength, getRootGraphCollisionRadius } from '../collision';

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsSectionOptions = { graphMode: '2d' },
): void {
	const graph = instance as GraphPhysicsControls;
	const graphLayout = options.graphMode === '2d' ? options.graphLayout : undefined;
	applyPhysicsSettings(instance, settings, options);
	removeCentroidCenterForce(graph);
	graph.d3Force(
		'forceX',
		forceX<FGNode>(0).strength(node => getRootGraphCenterStrength(node, settings.centerForce, graphLayout)),
	);
	graph.d3Force(
		'forceY',
		forceY<FGNode>(0).strength(node => getRootGraphCenterStrength(node, settings.centerForce, graphLayout)),
	);
	graph.d3Force(
		'collision',
		forceCollide<FGNode>(node => getRootGraphCollisionRadius(node, graphLayout)).iterations(COLLISION_ITERATIONS),
	);
	if (options.graphLayout || options.graphMode !== '2d') {
		applyGraphSectionBoundsForce(instance, { ...options, settings });
	}
	graph.d3ReheatSimulation();
}
