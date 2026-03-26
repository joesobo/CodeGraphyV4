import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../shared/contracts';
import { toD3Repel, type FGLink, type FGNode } from '../../graphModel';
import { hasDistanceAndStrength, hasStrength } from '../../graphSupport/guards';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;

export function havePhysicsSettingsChanged(
	previous: IPhysicsSettings | null,
	next: IPhysicsSettings,
): boolean {
	return !previous
		|| previous.repelForce !== next.repelForce
		|| previous.centerForce !== next.centerForce
		|| previous.linkDistance !== next.linkDistance
		|| previous.linkForce !== next.linkForce
		|| previous.damping !== next.damping;
}

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
): void {
	const chargeForce = instance.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(settings.repelForce));

	const linkForce = instance.d3Force('link');
	if (hasDistanceAndStrength(linkForce)) {
		linkForce.distance(settings.linkDistance);
		linkForce.strength(settings.linkForce);
	}

	const forceXInstance = instance.d3Force('forceX');
	if (hasStrength(forceXInstance)) forceXInstance.strength(settings.centerForce);

	const forceYInstance = instance.d3Force('forceY');
	if (hasStrength(forceYInstance)) forceYInstance.strength(settings.centerForce);

	instance.d3ReheatSimulation();
}

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
): void {
	applyPhysicsSettings(instance, settings);
	instance.d3Force('forceX', forceX(0).strength(settings.centerForce));
	instance.d3Force('forceY', forceY(0).strength(settings.centerForce));
	instance.d3Force('collision', forceCollide((node: FGNode) => node.size + 4));
}
