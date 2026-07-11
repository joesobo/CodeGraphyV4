import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { GraphPhysicsControls, GraphPhysicsInstance, GraphPhysicsOptions } from '../../model';
import { applyCenterSettings, removeCentroidCenterForce } from './centerForce';
import { applyChargeSettings } from './chargeForce';
import { applyCollisionSettings } from './collisionForce';
import { applyLinkSettings } from './linkForce';

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	_options: GraphPhysicsOptions = {},
): void {
	const graph = instance as GraphPhysicsControls;
	removeCentroidCenterForce(graph);
	applyChargeSettings(graph, settings);
	applyLinkSettings(graph, settings);
	applyCenterSettings(graph, settings);
	applyCollisionSettings(graph);
	graph.d3ReheatSimulation();
}
