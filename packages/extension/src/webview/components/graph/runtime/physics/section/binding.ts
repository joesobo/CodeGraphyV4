import type { GraphPhysicsControls, GraphPhysicsInstance, GraphPhysicsSectionOptions } from '../model';
import { createGraphSectionBoundsForce } from './force';

export function applyGraphSectionBoundsForce(
	instance: GraphPhysicsInstance,
	options: GraphPhysicsSectionOptions,
): void {
	const graph = instance as GraphPhysicsControls;
	const force = options.graphMode === '2d' && options.graphLayout
		? createGraphSectionBoundsForce(options.graphLayout, {
			links: options.links,
			settings: options.settings,
		})
		: null;

	graph.d3Force('sectionBounds', force);
	graph.d3ReheatSimulation();
}
