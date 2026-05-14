import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { GraphPhysicsControls, GraphPhysicsInstance, GraphPhysicsSectionOptions } from '../../model';
import { applyCenterSettings, removeCentroidCenterForce } from './centerForce';
import { applyChargeSettings } from './chargeForce';
import { applyCollisionSettings } from './collisionForce';
import { applyLinkSettings } from './linkForce';

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsSectionOptions = { graphMode: '2d' },
): void {
	const graph = instance as GraphPhysicsControls;
	const graphLayout = options.graphMode === '2d' ? options.graphLayout : undefined;
	removeCentroidCenterForce(graph);
	applyChargeSettings(graph, settings, graphLayout);
	applyLinkSettings(graph, settings, graphLayout);
	applyCenterSettings(graph, settings, graphLayout);
	applyCollisionSettings(graph, graphLayout);
	graph.d3ReheatSimulation();
}
