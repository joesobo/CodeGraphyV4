import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../shared/settings/graphLayout';
import { toD3Repel, type FGLink, type FGNode } from '../model/build';
import { SECTION_FRAME_HEADER_HEIGHT } from '../sectionFrames/model';
import { hasDistanceAndStrength, hasDistanceMax, hasStrength } from '../support/guards';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;
const DEFAULT_CHARGE_RANGE = 1000;
const COLLISION_PADDING = 4;
const COLLISION_ITERATIONS = 16;
const SECTION_MEMBER_PADDING = 16;
const SECTION_MEMBER_CENTER_STRENGTH = 0.08;
const SECTION_MEMBER_ANCHOR_STRENGTH = 0.16;
const SECTION_MEMBER_ANCHOR_MAX_IMPULSE = 32;
const SECTION_EXTERNAL_PUSH_STRENGTH = 0.4;
const SECTION_RECTANGLE_COLLISION_PADDING = 12;
const SECTION_RECTANGLE_COLLISION_STRENGTH = 0.9;
const SECTION_EXTERNAL_COLLISION_WEIGHT = 0.04;

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

interface BoundsRect {
	height: number;
	width: number;
	x: number;
	y: number;
}

interface RectangleCollisionRect extends BoundsRect {
	centerX: number;
	centerY: number;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
	return new Map(nodes.map(node => [node.id, node]));
}

export function getGraphCollisionRadius(node: FGNode): number {
	if (isExpandedGraphSection(node)) {
		return 0;
	}

	return (node.size ?? 0) + COLLISION_PADDING;
}

function getSectionBounds(
	sectionNode: FGNode | undefined,
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): BoundsRect | undefined {
	const section = graphLayout.sections[sectionId];
	if (!section || section.collapsed) {
		return undefined;
	}

	const height = isFiniteNumber(sectionNode?.sectionHeight) ? sectionNode.sectionHeight : section.height;
	const width = isFiniteNumber(sectionNode?.sectionWidth) ? sectionNode.sectionWidth : section.width;
	const centerX = sectionNode?.x;
	const centerY = sectionNode?.y;
	return {
		height,
		width,
		x: isFiniteNumber(centerX) ? centerX - (width / 2) : section.x,
		y: isFiniteNumber(centerY) ? centerY - (height / 2) : section.y,
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
  bounds: BoundsRect,
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

function getSectionMemberBounds(
	bounds: BoundsRect,
): BoundsRect {
	return {
		height: Math.max(1, bounds.height - SECTION_FRAME_HEADER_HEIGHT),
		width: bounds.width,
		x: bounds.x,
		y: bounds.y + SECTION_FRAME_HEADER_HEIGHT,
	};
}

function getConstrainedMemberPosition(
	node: FGNode,
	bounds: BoundsRect,
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
	bounds: BoundsRect,
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
  bounds: BoundsRect,
  alpha: number,
): void {
	const memberBounds = getSectionMemberBounds(bounds);
	const position = getConstrainedMemberPosition(node, memberBounds);
	if (!position) {
		return;
	}

	const nextX = clamp(position.x, memberBounds.x + position.margin, memberBounds.x + memberBounds.width - position.margin);
	const nextY = clamp(position.y, memberBounds.y + position.margin, memberBounds.y + memberBounds.height - position.margin);

	applyConstrainedMemberCoordinates(node, nextX, nextY);
	applyMemberCenterVelocity(node, memberBounds, alpha, nextX, nextY);
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
): Map<string, BoundsRect> {
	const nodeMap = createNodeMap(nodes);
	const bounds = new Map<string, BoundsRect>();

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
	bounds: BoundsRect,
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
	bounds: BoundsRect,
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
	bounds: BoundsRect,
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
	sectionBounds: ReadonlyMap<string, BoundsRect>,
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	if (node.isDragging || node.isGraphSection) {
		return;
	}

	for (const [sectionId, bounds] of sectionBounds) {
		if (node.id === sectionId || isOwnedBySection(node, sectionId, graphLayout)) {
			continue;
		}

		pushExternalNodeOutOfSection(node, bounds, alpha);
	}
}

function getNodeRectangleCollisionRect(node: FGNode): RectangleCollisionRect | undefined {
	if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
		return undefined;
	}

	if (
		node.isGraphSection
		&& !node.isCollapsedGraphSection
		&& isFiniteNumber(node.sectionHeight)
		&& isFiniteNumber(node.sectionWidth)
	) {
		return {
			centerX: node.x,
			centerY: node.y,
			height: node.sectionHeight,
			width: node.sectionWidth,
			x: node.x - (node.sectionWidth / 2),
			y: node.y - (node.sectionHeight / 2),
		};
	}

	const radius = getGraphCollisionRadius(node);
	return {
		centerX: node.x,
		centerY: node.y,
		height: radius * 2,
		width: radius * 2,
		x: node.x - radius,
		y: node.y - radius,
	};
}

function isExpandedGraphSection(node: FGNode): boolean {
	return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

function shouldApplyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (!isExpandedGraphSection(left) && !isExpandedGraphSection(right)) {
		return false;
	}

	if (left.isGraphSection && isOwnedBySection(right, left.id, graphLayout)) {
		return false;
	}

	if (right.isGraphSection && isOwnedBySection(left, right.id, graphLayout)) {
		return false;
	}

	return true;
}

function getGraphChargeStrength(
	repelForce: number,
): (node: FGNode) => number {
	const defaultStrength = toD3Repel(repelForce);
	return (node: FGNode) => isExpandedGraphSection(node) ? 0 : defaultStrength;
}

function getCollisionMoveWeight(node: FGNode, other: FGNode): number {
	if (node.isDragging || node.isPinned) {
		return 0;
	}

	return isExpandedGraphSection(node) && !isExpandedGraphSection(other)
		? SECTION_EXTERNAL_COLLISION_WEIGHT
		: 1;
}

function getCollisionDirection(left: FGNode, right: FGNode, leftCenter: number, rightCenter: number): number {
	if (leftCenter < rightCenter) {
		return -1;
	}

	if (leftCenter > rightCenter) {
		return 1;
	}

	return left.id < right.id ? -1 : 1;
}

function applyRectangleCollisionPosition(
	left: FGNode,
	right: FGNode,
	axis: 'x' | 'y',
	direction: number,
	overlap: number,
): void {
	if (!isExpandedGraphSection(left) || !isExpandedGraphSection(right)) {
		return;
	}

	const leftWeight = getCollisionMoveWeight(left, right);
	const rightWeight = getCollisionMoveWeight(right, left);
	const totalWeight = leftWeight + rightWeight;
	if (totalWeight === 0) {
		return;
	}

	const correction = overlap + SECTION_RECTANGLE_COLLISION_PADDING;
	const leftCorrection = direction * correction * (leftWeight / totalWeight);
	const rightCorrection = -direction * correction * (rightWeight / totalWeight);

	if (axis === 'x') {
		left.x = resolveNodeCoordinate(left.x, 0) + leftCorrection;
		right.x = resolveNodeCoordinate(right.x, 0) + rightCorrection;
		return;
	}

	left.y = resolveNodeCoordinate(left.y, 0) + leftCorrection;
	right.y = resolveNodeCoordinate(right.y, 0) + rightCorrection;
}

function applyRectangleCollisionVelocity(
	left: FGNode,
	right: FGNode,
	axis: 'x' | 'y',
	direction: number,
	overlap: number,
	alpha: number,
): void {
	const leftWeight = getCollisionMoveWeight(left, right);
	const rightWeight = getCollisionMoveWeight(right, left);
	const totalWeight = leftWeight + rightWeight;
	if (totalWeight === 0) {
		return;
	}

	const impulse = overlap * SECTION_RECTANGLE_COLLISION_STRENGTH * alpha;
	const leftImpulse = direction * impulse * (leftWeight / totalWeight);
	const rightImpulse = -direction * impulse * (rightWeight / totalWeight);

	if (axis === 'x') {
		left.vx = (left.vx ?? 0) + leftImpulse;
		right.vx = (right.vx ?? 0) + rightImpulse;
		return;
	}

	left.vy = (left.vy ?? 0) + leftImpulse;
	right.vy = (right.vy ?? 0) + rightImpulse;
}

function applyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	if (!shouldApplyRectangleCollision(left, right, graphLayout)) {
		return;
	}

	const leftRect = getNodeRectangleCollisionRect(left);
	const rightRect = getNodeRectangleCollisionRect(right);
	if (!leftRect || !rightRect) {
		return;
	}

	const overlapX = Math.min(leftRect.x + leftRect.width, rightRect.x + rightRect.width)
		- Math.max(leftRect.x, rightRect.x);
	const overlapY = Math.min(leftRect.y + leftRect.height, rightRect.y + rightRect.height)
		- Math.max(leftRect.y, rightRect.y);
	if (overlapX <= 0 || overlapY <= 0) {
		return;
	}

	if (overlapX <= overlapY) {
		const direction = getCollisionDirection(left, right, leftRect.centerX, rightRect.centerX);
		applyRectangleCollisionPosition(left, right, 'x', direction, overlapX);
		applyRectangleCollisionVelocity(
			left,
			right,
			'x',
			direction,
			overlapX,
			alpha,
		);
		return;
	}

	const direction = getCollisionDirection(left, right, leftRect.centerY, rightRect.centerY);
	applyRectangleCollisionPosition(left, right, 'y', direction, overlapY);
	applyRectangleCollisionVelocity(
		left,
		right,
		'y',
		direction,
		overlapY,
		alpha,
	);
}

function applyRectangleCollisions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
		if (!isExpandedGraphSection(nodes[leftIndex])) {
			continue;
		}

		for (let rightIndex = 0; rightIndex < nodes.length; rightIndex += 1) {
			if (
				rightIndex === leftIndex
				|| (isExpandedGraphSection(nodes[rightIndex]) && rightIndex < leftIndex)
			) {
				continue;
			}

			applyRectangleCollision(nodes[leftIndex], nodes[rightIndex], graphLayout, alpha);
		}
	}
}

function getSectionMemberCentroid(
	sectionId: string,
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
): { x: number; y: number } | undefined {
	let count = 0;
	let totalX = 0;
	let totalY = 0;

	for (const node of nodes) {
		if (
			node.id === sectionId
			|| node.isGraphSection
			|| node.isDragging
			|| !isOwnedBySection(node, sectionId, graphLayout)
			|| !isFiniteNumber(node.x)
			|| !isFiniteNumber(node.y)
		) {
			continue;
		}

		count += 1;
		totalX += node.x;
		totalY += node.y;
	}

	return count === 0
		? undefined
		: { x: totalX / count, y: totalY / count };
}

function pullSectionTowardOwnedMembers(
	sectionNode: FGNode,
	bounds: BoundsRect,
	centroid: { x: number; y: number } | undefined,
	alpha: number,
): void {
	if (!centroid || sectionNode.isDragging || sectionNode.isPinned) {
		return;
	}

	const memberBounds = getSectionMemberBounds(bounds);
	const centerX = memberBounds.x + (memberBounds.width / 2);
	const centerY = memberBounds.y + (memberBounds.height / 2);
	const impulseX = (centroid.x - centerX) * SECTION_MEMBER_ANCHOR_STRENGTH * alpha;
	const impulseY = (centroid.y - centerY) * SECTION_MEMBER_ANCHOR_STRENGTH * alpha;
	const magnitude = Math.hypot(impulseX, impulseY);
	const scale = magnitude > SECTION_MEMBER_ANCHOR_MAX_IMPULSE
		? SECTION_MEMBER_ANCHOR_MAX_IMPULSE / magnitude
		: 1;
	sectionNode.vx = (sectionNode.vx ?? 0) + impulseX * scale;
	sectionNode.vy = (sectionNode.vy ?? 0) + impulseY * scale;
}

function pullSectionsTowardOwnedMembers(
	nodes: readonly FGNode[],
	sectionBounds: ReadonlyMap<string, BoundsRect>,
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	const nodeMap = createNodeMap(nodes);
	for (const [sectionId, bounds] of sectionBounds) {
		const sectionNode = nodeMap.get(sectionId);
		if (!sectionNode) {
			continue;
		}

		pullSectionTowardOwnedMembers(
			sectionNode,
			bounds,
			getSectionMemberCentroid(sectionId, nodes, graphLayout),
			alpha,
		);
	}
}

export function createGraphSectionBoundsForce(
	graphLayout: GraphLayoutSettings,
): GraphSectionBoundsForce {
	let nodes: FGNode[] = [];

	const force = ((alpha: number): void => {
		const sectionBounds = createSectionBoundsMap(nodes, graphLayout);
		pullSectionsTowardOwnedMembers(nodes, sectionBounds, graphLayout, alpha);
		applyRectangleCollisions(nodes, graphLayout, alpha);

		for (const node of nodes) {
			if (node.isDragging) {
				continue;
			}

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
	if (hasStrength(chargeForce)) chargeForce.strength(getGraphChargeStrength(settings.repelForce));
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
