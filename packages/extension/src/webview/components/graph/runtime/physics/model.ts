import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { IPhysicsSettings } from '../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../model/build';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink>;

export const DEFAULT_CHARGE_RANGE = 1000;
export const COLLISION_PADDING = 4;
export const COLLISION_ITERATIONS = 16;

export interface GraphPhysicsControls {
	d3Force(name: string): unknown;
	d3Force(name: string, force: unknown): unknown;
	d3ReheatSimulation(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

export interface GraphCollisionForceControls {
	radius(value: (node: FGNode) => number): unknown;
}

export interface GraphPhysicsOptions {
	settings?: IPhysicsSettings;
}

export type GraphLinkEndpoint = string | number | { id?: string | number } | undefined;

export interface GraphLinkLike {
	source?: GraphLinkEndpoint;
	target?: GraphLinkEndpoint;
}

export interface NodeDelta {
	distance: number;
	x: number;
	y: number;
}

export type CollisionAxis = 'x' | 'y';
