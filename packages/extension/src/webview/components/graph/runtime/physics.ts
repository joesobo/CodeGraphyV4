import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import { toD3Repel, type FGLink, type FGNode } from '../model/build';
import { hasDistanceAndStrength, hasDistanceMax, hasStrength } from '../support/guards';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;

interface GraphPhysicsControls {
	d3Force(name: string): unknown;
	d3Force(name: string, force: unknown): unknown;
	d3ReheatSimulation(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

export function havePhysicsSettingsChanged(
	previous: IPhysicsSettings | null,
	next: IPhysicsSettings,
): boolean {
	return !previous
		|| previous.repelForce !== next.repelForce
		|| previous.centerForce !== next.centerForce
		|| previous.linkDistance !== next.linkDistance
		|| previous.linkForce !== next.linkForce
		|| previous.damping !== next.damping
		|| previous.chargeRange !== next.chargeRange;
}

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
): void {
	const graph = instance as GraphPhysicsControls;
	const chargeForce = graph.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(settings.repelForce));
	if (hasDistanceMax(chargeForce)) {
		chargeForce.distanceMax(settings.chargeRange ?? Infinity);
	}

	const linkForce = graph.d3Force('link');
	if (hasDistanceAndStrength(linkForce)) {
		linkForce.distance(settings.linkDistance);
		linkForce.strength(settings.linkForce);
	}

	const forceXInstance = graph.d3Force('forceX');
	if (hasStrength(forceXInstance)) forceXInstance.strength(settings.centerForce);

	const forceYInstance = graph.d3Force('forceY');
	if (hasStrength(forceYInstance)) forceYInstance.strength(settings.centerForce);

	graph.d3ReheatSimulation();
}

export function syncPhysicsAnimation(
	instance: GraphPhysicsInstance,
	paused: boolean,
): void {
	const graph = instance as GraphPhysicsControls;
	if (paused) {
		graph.pauseAnimation?.();
		return;
	}

	graph.resumeAnimation?.();
	graph.d3ReheatSimulation();
}

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
): void {
	const graph = instance as GraphPhysicsControls;
	applyPhysicsSettings(instance, settings);
	graph.d3Force('forceX', forceX(0).strength(settings.centerForce));
	graph.d3Force('forceY', forceY(0).strength(settings.centerForce));
	graph.d3Force('collision', forceCollide((node: FGNode) => node.size + 4));
	graph.d3ReheatSimulation();
}
