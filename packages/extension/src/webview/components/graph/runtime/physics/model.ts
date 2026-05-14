import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../../shared/settings/graphLayout';
import type { FGLink, FGNode } from '../../model/build';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;

export const DEFAULT_CHARGE_RANGE = 1000;
export const COLLISION_PADDING = 4;
export const COLLISION_ITERATIONS = 16;
export const SECTION_MEMBER_PADDING = 16;
export const SECTION_MEMBER_CENTER_STRENGTH = 0.08;
export const SECTION_BRIDGE_LINK_MAX_IMPULSE = 6;
export const SECTION_RECTANGLE_MAX_COLLISION_IMPULSE = 3;
export const SECTION_RECTANGLE_MAX_SECTION_IMPULSE = 12;
export const SECTION_RECTANGLE_MAX_REPEL_GAP = 32;
export const SECTION_RECTANGLE_REPEL_PADDING_RATIO = 0.25;
export const SECTION_CHARGE_MULTIPLIER_CAP = 12;
export const SECTION_BOUNDARY_EPSILON = 1;
export const MIN_VELOCITY_INTEGRATION_DECAY = 0.05;
export const MAX_NORMALIZED_REPEL_FORCE = 20;

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

export interface GraphPhysicsSectionOptions {
	graphLayout?: GraphLayoutSettings;
	graphMode: '2d' | '3d';
	links?: readonly FGLink[];
	settings?: IPhysicsSettings;
}

export interface GraphSectionBoundsForce {
	(alpha: number): void;
	initialize(nodes: FGNode[]): void;
}

export interface GraphSectionBoundsForceOptions {
	links?: readonly FGLink[];
	settings?: Pick<IPhysicsSettings, 'centerForce' | 'damping' | 'linkDistance' | 'linkForce' | 'repelForce'>;
}

export interface BoundsRect {
	height: number;
	width: number;
	x: number;
	y: number;
}

export interface RectangleCollisionRect extends BoundsRect {
	centerX: number;
	centerY: number;
}

export interface SectionCenter {
	x: number;
	y: number;
}

export interface SectionMemberPosition {
	x: number;
	y: number;
}

export type GraphLinkEndpoint = string | number | { id?: string | number } | undefined;

export interface GraphLinkLike {
	source?: GraphLinkEndpoint;
	target?: GraphLinkEndpoint;
}

export interface NodeBoundsMargin {
	x: number;
	y: number;
}

export interface NodeDelta {
	distance: number;
	x: number;
	y: number;
}

export interface CollisionWeightShares {
	left: number;
	right: number;
}

export interface RectangleCollisionOverlap {
	leftRect: RectangleCollisionRect;
	overlapX: number;
	overlapY: number;
	rightRect: RectangleCollisionRect;
}

export type CollisionAxis = 'x' | 'y';
export type SectionEdge = 'bottom' | 'left' | 'right' | 'top';
