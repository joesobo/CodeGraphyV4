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
const SECTION_EXTERNAL_PUSH_STRENGTH = 0.4;

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

function getSectionCollisionSize(
	node: FGNode,
): { height: number; width: number } | undefined {
	if (!node.isGraphSection || node.isCollapsedGraphSection) {
		return undefined;
	}

	if (!isFiniteNumber(node.sectionHeight) || !isFiniteNumber(node.sectionWidth)) {
		return undefined;
	}

	return {
		height: node.sectionHeight,
		width: node.sectionWidth,
	};
}

export function getGraphCollisionRadius(node: FGNode): number {
	const sectionSize = getSectionCollisionSize(node);
	if (sectionSize) {
		return (Math.sqrt(sectionSize.width ** 2 + sectionSize.height ** 2) / 2) + COLLISION_PADDING;
	}

	return (node.size ?? 0) + COLLISION_PADDING;
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

function resolveNodeCoordinate(value: unknown, fallback: number): number {
	return isFiniteNumber(value) ? value : fallback;
}

function getConstrainedMemberPosition(
	node: FGNode,
	bounds: { height: number; width: number; x: number; y: number },
): { margin: number; x: number; y: number } | undefined {
	const margin = Math.max(1, node.size ?? 1) + SECTION_MEMBER_PADDING;
	if (isPinnedInsideBounds(node, bounds, margin)) {
		return undefined;
	}

	const fallbackX = bounds.x + bounds.width / 2;
	const fallbackY = bounds.y + bounds.height / 2;
	return {
		margin,
		x: resolveNodeCoordinate(node.x, fallbackX),
		y: resolveNodeCoordinate(node.y, fallbackY),
	};
}

function applyConstrainedMemberCoordinates(
	node: FGNode,
	x: number,
	y: number,
): void {
	node.x = x;
	node.y = y;

	if (isFiniteNumber(node.fx)) {
		node.fx = x;
	}

	if (isFiniteNumber(node.fy)) {
		node.fy = y;
	}
}

function applyMemberCenterVelocity(
	node: FGNode,
	bounds: { height: number; width: number; x: number; y: number },
	alpha: number,
	x: number,
	y: number,
): void {
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	node.vx = (node.vx ?? 0) + (centerX - x) * SECTION_MEMBER_CENTER_STRENGTH * alpha;
	node.vy = (node.vy ?? 0) + (centerY - y) * SECTION_MEMBER_CENTER_STRENGTH * alpha;
}

function constrainMemberNode(
  node: FGNode,
  bounds: { height: number; width: number; x: number; y: number },
  alpha: number,
): void {
	const position = getConstrainedMemberPosition(node, bounds);
	if (!position) {
		return;
	}

	const nextX = clamp(position.x, bounds.x + position.margin, bounds.x + bounds.width - position.margin);
	const nextY = clamp(position.y, bounds.y + position.margin, bounds.y + bounds.height - position.margin);

	applyConstrainedMemberCoordinates(node, nextX, nextY);
	applyMemberCenterVelocity(node, bounds, alpha, nextX, nextY);
}

function getOwnerSectionId(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): string | null {
	return node.ownerSectionId
		?? graphLayout.ownership[node.id]?.ownerSectionId
		?? null;
}

function isOwnedBySection(
	node: FGNode,
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): boolean {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (ownerSectionId === sectionId) {
			return true;
		}

		if (visited.has(ownerSectionId)) {
			return false;
		}

		visited.add(ownerSectionId);
		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return false;
}

function createSectionBoundsMap(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
): Map<string, { height: number; width: number; x: number; y: number }> {
	const nodeMap = createNodeMap(nodes);
	const bounds = new Map<string, { height: number; width: number; x: number; y: number }>();

	for (const sectionId of Object.keys(graphLayout.sections)) {
		const sectionBounds = getSectionBounds(nodeMap.get(sectionId), sectionId, graphLayout);
		if (sectionBounds) {
			bounds.set(sectionId, sectionBounds);
		}
	}

	return bounds;
}

function isWithinExpandedBounds(
	x: number,
	y: number,
	bounds: { height: number; width: number; x: number; y: number },
	margin: number,
): boolean {
	return x > bounds.x - margin
		&& x < bounds.x + bounds.width + margin
		&& y > bounds.y - margin
		&& y < bounds.y + bounds.height + margin;
}

function findNearestExit(
	x: number,
	y: number,
	bounds: { height: number; width: number; x: number; y: number },
	margin: number,
): { directionX: number; directionY: number; distance: number; x: number; y: number } {
	const candidates = [
		{ directionX: -1, directionY: 0, distance: Math.abs(x - (bounds.x - margin)), x: bounds.x - margin, y },
		{
			directionX: 1,
			directionY: 0,
			distance: Math.abs((bounds.x + bounds.width + margin) - x),
			x: bounds.x + bounds.width + margin,
			y,
		},
		{ directionX: 0, directionY: -1, distance: Math.abs(y - (bounds.y - margin)), x, y: bounds.y - margin },
		{
			directionX: 0,
			directionY: 1,
			distance: Math.abs((bounds.y + bounds.height + margin) - y),
			x,
			y: bounds.y + bounds.height + margin,
		},
	];

	return candidates.reduce((nearest, candidate) =>
		candidate.distance < nearest.distance ? candidate : nearest,
	);
}

function pushExternalNodeOutOfSection(
	node: FGNode,
	bounds: { height: number; width: number; x: number; y: number },
	alpha: number,
): void {
	const margin = Math.max(1, node.size ?? 1) + SECTION_MEMBER_PADDING;
	const fallbackX = bounds.x + bounds.width / 2;
	const fallbackY = bounds.y + bounds.height / 2;
	const x = resolveNodeCoordinate(node.x, fallbackX);
	const y = resolveNodeCoordinate(node.y, fallbackY);

	if (!isWithinExpandedBounds(x, y, bounds, margin)) {
		return;
	}

	const exit = findNearestExit(x, y, bounds, margin);
	applyConstrainedMemberCoordinates(node, exit.x, exit.y);
	node.vx = (node.vx ?? 0) + exit.directionX * margin * SECTION_EXTERNAL_PUSH_STRENGTH * alpha;
	node.vy = (node.vy ?? 0) + exit.directionY * margin * SECTION_EXTERNAL_PUSH_STRENGTH * alpha;
}

function repelExternalNodesFromSections(
	node: FGNode,
	sectionBounds: ReadonlyMap<string, { height: number; width: number; x: number; y: number }>,
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	for (const [sectionId, bounds] of sectionBounds) {
		if (node.id === sectionId || isOwnedBySection(node, sectionId, graphLayout)) {
			continue;
		}

		pushExternalNodeOutOfSection(node, bounds, alpha);
	}
}

export function createGraphSectionBoundsForce(
	graphLayout: GraphLayoutSettings,
): GraphSectionBoundsForce {
	let nodes: FGNode[] = [];

	const force = ((alpha: number): void => {
		const sectionBounds = createSectionBoundsMap(nodes, graphLayout);

		for (const node of nodes) {
			const ownerSectionId = getOwnerSectionId(node, graphLayout);
			if (node.isGraphSection || !ownerSectionId) {
				repelExternalNodesFromSections(node, sectionBounds, graphLayout, alpha);
				continue;
			}

			const bounds = sectionBounds.get(ownerSectionId);
			if (!bounds) {
				repelExternalNodesFromSections(node, sectionBounds, graphLayout, alpha);
				continue;
			}

			constrainMemberNode(node, bounds, alpha);
			repelExternalNodesFromSections(node, sectionBounds, graphLayout, alpha);
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
		forceCollide(getGraphCollisionRadius).iterations(COLLISION_ITERATIONS),
	);
	if (options.graphLayout || options.graphMode !== '2d') {
		applyGraphSectionBoundsForce(instance, options);
	}
	graph.d3ReheatSimulation();
}

export { syncPhysicsAnimation } from './use/physics/hook';
