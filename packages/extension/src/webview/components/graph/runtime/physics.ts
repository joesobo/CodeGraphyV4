import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../shared/settings/graphLayout';
import { toD3Repel, type FGLink, type FGNode } from '../model/build';
import { hasDistanceAndStrength, hasDistanceMax, hasStrength } from '../support/guards';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;
const DEFAULT_CHARGE_RANGE = 1000;
const COLLISION_PADDING = 4;
const COLLISION_ITERATIONS = 16;
const SECTION_MEMBER_PADDING = 8;
const SECTION_MEMBER_CENTER_STRENGTH = 0.08;

interface GraphPhysicsControls {
	d3Force(name: string): unknown;
	d3Force(name: string, force: unknown): unknown;
	d3ReheatSimulation(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

interface GraphPhysicsSectionOptions {
	graphLayout?: GraphLayoutSettings;
	graphMode: '2d' | '3d';
}

export interface GraphSectionBoundsForce {
	(alpha: number): void;
	initialize(nodes: FGNode[]): void;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
	return new Map(nodes.map(node => [node.id, node]));
}

function getSectionBounds(
	sectionNode: FGNode | undefined,
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): { height: number; width: number; x: number; y: number } | undefined {
	const section = graphLayout.sections[sectionId];
	if (!section || section.collapsed) {
		return undefined;
	}

	return {
		height: sectionNode?.sectionHeight ?? section.height,
		width: sectionNode?.sectionWidth ?? section.width,
		x: isFiniteNumber(sectionNode?.x) ? sectionNode.x : section.x,
		y: isFiniteNumber(sectionNode?.y) ? sectionNode.y : section.y,
	};
}

function clamp(value: number, minimum: number, maximum: number): number {
	if (minimum > maximum) {
		return (minimum + maximum) / 2;
	}

	return Math.max(minimum, Math.min(maximum, value));
}

function isPinnedInsideBounds(
	node: FGNode,
	bounds: { height: number; width: number; x: number; y: number },
	margin: number,
): boolean {
	return isFiniteNumber(node.fx)
		&& isFiniteNumber(node.fy)
		&& node.fx >= bounds.x + margin
		&& node.fx <= bounds.x + bounds.width - margin
		&& node.fy >= bounds.y + margin
		&& node.fy <= bounds.y + bounds.height - margin;
}

function constrainMemberNode(
	node: FGNode,
	bounds: { height: number; width: number; x: number; y: number },
	alpha: number,
): void {
	const margin = Math.max(1, node.size ?? 1) + SECTION_MEMBER_PADDING;
	if (isPinnedInsideBounds(node, bounds, margin)) {
		return;
	}

	const x = isFiniteNumber(node.x) ? node.x : bounds.x + bounds.width / 2;
	const y = isFiniteNumber(node.y) ? node.y : bounds.y + bounds.height / 2;
	const nextX = clamp(x, bounds.x + margin, bounds.x + bounds.width - margin);
	const nextY = clamp(y, bounds.y + margin, bounds.y + bounds.height - margin);

	node.x = nextX;
	node.y = nextY;

	if (isFiniteNumber(node.fx)) {
		node.fx = nextX;
	}

	if (isFiniteNumber(node.fy)) {
		node.fy = nextY;
	}

	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	node.vx = (node.vx ?? 0) + (centerX - nextX) * SECTION_MEMBER_CENTER_STRENGTH * alpha;
	node.vy = (node.vy ?? 0) + (centerY - nextY) * SECTION_MEMBER_CENTER_STRENGTH * alpha;
}

export function createGraphSectionBoundsForce(
	graphLayout: GraphLayoutSettings,
): GraphSectionBoundsForce {
	let nodes: FGNode[] = [];

	const force = ((alpha: number): void => {
		const nodeMap = createNodeMap(nodes);

		for (const node of nodes) {
			const ownerSectionId = node.ownerSectionId
				?? graphLayout.ownership[node.id]?.ownerSectionId
				?? null;
			if (node.isGraphSection || !ownerSectionId) {
				continue;
			}

			const bounds = getSectionBounds(nodeMap.get(ownerSectionId), ownerSectionId, graphLayout);
			if (!bounds) {
				continue;
			}

			constrainMemberNode(node, bounds, alpha);
		}
	}) as GraphSectionBoundsForce;

	force.initialize = (nextNodes: FGNode[]): void => {
		nodes = nextNodes;
	};

	return force;
}

export function applyGraphSectionBoundsForce(
	instance: GraphPhysicsInstance,
	options: GraphPhysicsSectionOptions,
): void {
	const graph = instance as GraphPhysicsControls;
	const force = options.graphMode === '2d' && options.graphLayout
		? createGraphSectionBoundsForce(options.graphLayout)
		: null;

	graph.d3Force('sectionBounds', force);
	graph.d3ReheatSimulation();
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
		|| previous.damping !== next.damping;
}

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
): void {
	const graph = instance as GraphPhysicsControls;
	const chargeForce = graph.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(settings.repelForce));
	if (hasDistanceMax(chargeForce)) {
		chargeForce.distanceMax(DEFAULT_CHARGE_RANGE);
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

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsSectionOptions = { graphMode: '2d' },
): void {
	const graph = instance as GraphPhysicsControls;
	applyPhysicsSettings(instance, settings);
	graph.d3Force('forceX', forceX(0).strength(settings.centerForce));
	graph.d3Force('forceY', forceY(0).strength(settings.centerForce));
	graph.d3Force(
		'collision',
		forceCollide((node: FGNode) => node.size + COLLISION_PADDING).iterations(COLLISION_ITERATIONS),
	);
	if (options.graphLayout || options.graphMode !== '2d') {
		applyGraphSectionBoundsForce(instance, options);
	}
	graph.d3ReheatSimulation();
}

export { syncPhysicsAnimation } from './use/physics/hook';
