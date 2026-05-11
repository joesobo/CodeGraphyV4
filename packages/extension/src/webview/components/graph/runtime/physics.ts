import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../shared/settings/graphLayout';
import { DEFAULT_NODE_SIZE, toD3Repel, type FGLink, type FGNode } from '../model/build';
import { SECTION_FRAME_HEADER_HEIGHT } from '../sectionFrames/model';
import { hasDistanceAndStrength, hasDistanceMax, hasStrength } from '../support/guards';

export type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;
const DEFAULT_CHARGE_RANGE = 1000;
const COLLISION_PADDING = 4;
const COLLISION_ITERATIONS = 16;
const SECTION_MEMBER_PADDING = 16;
const SECTION_MEMBER_CENTER_STRENGTH = 0.08;
const SECTION_RECTANGLE_COLLISION_STRENGTH = 0.9;
const SECTION_EXTERNAL_COLLISION_MAX_IMPULSE = 8;
const SECTION_RECTANGLE_MAX_REPEL_GAP = 32;
const SECTION_RECTANGLE_REPEL_PADDING_RATIO = 0.25;
const SECTION_CHARGE_MULTIPLIER_CAP = 12;
const MAX_NORMALIZED_REPEL_FORCE = 20;

interface GraphPhysicsControls {
	d3Force(name: string): unknown;
	d3Force(name: string, force: unknown): unknown;
	d3ReheatSimulation(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

interface GraphCollisionForceControls {
	radius(value: (node: FGNode) => number): unknown;
}

interface GraphPhysicsSectionOptions {
	graphLayout?: GraphLayoutSettings;
	graphMode: '2d' | '3d';
	links?: readonly FGLink[];
	settings?: IPhysicsSettings;
}

export interface GraphSectionBoundsForce {
	(alpha: number): void;
	initialize(nodes: FGNode[]): void;
}

interface GraphSectionBoundsForceOptions {
	links?: readonly FGLink[];
	settings?: Pick<IPhysicsSettings, 'centerForce' | 'linkDistance' | 'linkForce' | 'repelForce'>;
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

interface SectionCenter {
	x: number;
	y: number;
}

type CollisionImpulseBudget = Map<string, number>;
type GraphLinkEndpoint = string | number | { id?: string | number } | undefined;

interface GraphLinkLike {
	source?: GraphLinkEndpoint;
	target?: GraphLinkEndpoint;
}

interface NodeBoundsMargin {
	x: number;
	y: number;
}

interface NodeDelta {
	distance: number;
	x: number;
	y: number;
}

interface CollisionWeightShares {
	left: number;
	right: number;
}

interface RectangleCollisionOverlap {
	leftRect: RectangleCollisionRect;
	overlapX: number;
	overlapY: number;
	rightRect: RectangleCollisionRect;
}

type CollisionAxis = 'x' | 'y';

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function hasRadius(value: unknown): value is GraphCollisionForceControls {
	return !!value && typeof (value as GraphCollisionForceControls).radius === 'function';
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

function getRootGraphCollisionRadius(
	node: FGNode,
	graphLayout: GraphLayoutSettings | undefined,
): number {
	if (graphLayout && hasExpandedOwnerSection(node, graphLayout)) {
		return 0;
	}

	return getGraphCollisionRadius(node);
}

function getRootGraphCenterStrength(
	node: FGNode,
	centerForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): number {
	if (graphLayout && hasExpandedOwnerSection(node, graphLayout)) {
		return 0;
	}

	return centerForce;
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
  margin: NodeBoundsMargin,
): boolean {
	return isFiniteNumber(node.fx)
		&& isFiniteNumber(node.fy)
		&& node.fx >= bounds.x + margin.x
		&& node.fx <= bounds.x + bounds.width - margin.x
		&& node.fy >= bounds.y + margin.y
			&& node.fy <= bounds.y + bounds.height - margin.y;
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
): { margin: NodeBoundsMargin; x: number; y: number } | undefined {
	const margin = getMemberBoundsMargin(node);
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

function getMemberBoundsMargin(node: FGNode): NodeBoundsMargin {
	if (
		isExpandedGraphSection(node)
		&& isFiniteNumber(node.sectionHeight)
		&& isFiniteNumber(node.sectionWidth)
	) {
		return {
			x: (node.sectionWidth / 2) + SECTION_MEMBER_PADDING,
			y: (node.sectionHeight / 2) + SECTION_MEMBER_PADDING,
		};
	}

	const margin = Math.max(1, node.size ?? 1) + SECTION_MEMBER_PADDING;
	return { x: margin, y: margin };
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
	centerStrength: number,
): void {
	if (centerStrength === 0) {
		return;
	}

	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	node.vx = (node.vx ?? 0) + (centerX - x) * centerStrength * alpha;
	node.vy = (node.vy ?? 0) + (centerY - y) * centerStrength * alpha;
}

function constrainMemberNode(
  node: FGNode,
  bounds: BoundsRect,
  alpha: number,
	centerStrength: number,
): void {
	const memberBounds = getSectionMemberBounds(bounds);
	const position = getConstrainedMemberPosition(node, memberBounds);
	if (!position) {
		return;
	}

	const nextX = clamp(position.x, memberBounds.x + position.margin.x, memberBounds.x + memberBounds.width - position.margin.x);
	const nextY = clamp(position.y, memberBounds.y + position.margin.y, memberBounds.y + memberBounds.height - position.margin.y);

	applyConstrainedMemberCoordinates(node, nextX, nextY);
	applyMemberCenterVelocity(node, bounds, alpha, nextX, nextY, centerStrength);
}

function getMemberCollisionRadius(node: FGNode): number {
	return Math.max(1, node.size ?? 1) + COLLISION_PADDING;
}

function getMemberCollisionWeight(node: FGNode): number {
	return node.isDragging || node.isPinned ? 0 : 1;
}

function getSectionMemberCenterStrength(
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	return settings?.centerForce ?? SECTION_MEMBER_CENTER_STRENGTH;
}

function getSectionMemberRepelStrength(
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	return settings ? toD3Repel(settings.repelForce) : 0;
}

function getNormalizedRepelScale(settings: GraphSectionBoundsForceOptions['settings']): number {
	const normalizedRepel = clamp(settings?.repelForce ?? 0, 0, MAX_NORMALIZED_REPEL_FORCE);
	return normalizedRepel / MAX_NORMALIZED_REPEL_FORCE;
}

function getSectionRectangleRepelPadding(
	node: FGNode,
	rect: RectangleCollisionRect,
	settings: GraphSectionBoundsForceOptions['settings'],
): number {
	if (!isExpandedGraphSection(node)) {
		return 0;
	}

	const sizeAwarePadding = Math.min(rect.width, rect.height) * SECTION_RECTANGLE_REPEL_PADDING_RATIO;
	const maximumPadding = Math.max(SECTION_RECTANGLE_MAX_REPEL_GAP / 2, sizeAwarePadding);
	return getNormalizedRepelScale(settings) * maximumPadding;
}

function getSectionChargeMultiplier(node: FGNode): number {
	if (
		!isExpandedGraphSection(node)
		|| !isFiniteNumber(node.sectionHeight)
		|| !isFiniteNumber(node.sectionWidth)
	) {
		return 1;
	}

	const equivalentRadius = Math.sqrt((node.sectionWidth * node.sectionHeight) / Math.PI);
	const referenceRadius = DEFAULT_NODE_SIZE + COLLISION_PADDING;
	return clamp(equivalentRadius / referenceRadius, 1, SECTION_CHARGE_MULTIPLIER_CAP);
}

function getNodeDelta(left: FGNode, right: FGNode): NodeDelta {
	const deltaX = resolveNodeCoordinate(right.x, 0) - resolveNodeCoordinate(left.x, 0);
	const deltaY = resolveNodeCoordinate(right.y, 0) - resolveNodeCoordinate(left.y, 0);
	return {
		distance: Math.hypot(deltaX, deltaY) || 1,
		x: deltaX,
		y: deltaY,
	};
}

function addNodeVelocity(node: FGNode, deltaX: number, deltaY: number): void {
	node.vx = (node.vx ?? 0) + deltaX;
	node.vy = (node.vy ?? 0) + deltaY;
}

function moveNodePosition(node: FGNode, deltaX: number, deltaY: number): void {
	node.x = resolveNodeCoordinate(node.x, 0) + deltaX;
	node.y = resolveNodeCoordinate(node.y, 0) + deltaY;
}

function getMemberCollisionWeightShares(left: FGNode, right: FGNode): CollisionWeightShares | undefined {
	const leftWeight = getMemberCollisionWeight(left);
	const rightWeight = getMemberCollisionWeight(right);
	const totalWeight = leftWeight + rightWeight;
	return totalWeight === 0
		? undefined
		: {
			left: leftWeight / totalWeight,
			right: rightWeight / totalWeight,
		};
}

function getActiveCollisionVelocityShare(weightShare: number): number {
	return weightShare > 0 ? 0.5 : 0;
}

function collectSectionMemberGroups(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
): Map<string, FGNode[]> {
	const membersBySection = new Map<string, FGNode[]>();
	for (const node of nodes) {
		if (node.isGraphSection) {
			continue;
		}

		const ownerSectionId = getOwnerSectionId(node, graphLayout);
		if (!ownerSectionId || !graphLayout.sections[ownerSectionId] || graphLayout.sections[ownerSectionId].collapsed) {
			continue;
		}

		const members = membersBySection.get(ownerSectionId) ?? [];
		members.push(node);
		membersBySection.set(ownerSectionId, members);
	}

	return membersBySection;
}

function applyMemberChargeForce(
	left: FGNode,
	right: FGNode,
	repelStrength: number,
	alpha: number,
): void {
	const weights = getMemberCollisionWeightShares(left, right);
	if (!weights || repelStrength === 0) {
		return;
	}

	const delta = getNodeDelta(left, right);
	const distanceSquared = Math.max(delta.x * delta.x + delta.y * delta.y, 1);
	const force = (repelStrength * alpha) / distanceSquared;
	addNodeVelocity(left, delta.x * force * weights.left, delta.y * force * weights.left);
	addNodeVelocity(right, -delta.x * force * weights.right, -delta.y * force * weights.right);
}

function applySectionMemberChargeForces(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
	alpha: number,
): void {
	const repelStrength = getSectionMemberRepelStrength(settings);
	if (repelStrength === 0) {
		return;
	}

	for (const members of collectSectionMemberGroups(nodes, graphLayout).values()) {
		for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
			for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
				applyMemberChargeForce(members[leftIndex], members[rightIndex], repelStrength, alpha);
			}
		}
	}
}

function applyMemberCircleCollision(
	left: FGNode,
	right: FGNode,
	alpha: number,
): void {
	const delta = getNodeDelta(left, right);
	const minimumDistance = getMemberCollisionRadius(left) + getMemberCollisionRadius(right);
	if (delta.distance >= minimumDistance) {
		return;
	}

	const weights = getMemberCollisionWeightShares(left, right);
	if (!weights) {
		return;
	}

	const normalX = delta.x / delta.distance;
	const normalY = delta.y / delta.distance;
	const overlap = minimumDistance - delta.distance;
	const leftVelocityShare = getActiveCollisionVelocityShare(weights.left);
	const rightVelocityShare = getActiveCollisionVelocityShare(weights.right);
	moveNodePosition(left, -normalX * overlap * weights.left, -normalY * overlap * weights.left);
	moveNodePosition(right, normalX * overlap * weights.right, normalY * overlap * weights.right);
	addNodeVelocity(left, -normalX * overlap * alpha * leftVelocityShare, -normalY * overlap * alpha * leftVelocityShare);
	addNodeVelocity(right, normalX * overlap * alpha * rightVelocityShare, normalY * overlap * alpha * rightVelocityShare);
}

function applySectionMemberCollisions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	alpha: number,
): void {
	for (const members of collectSectionMemberGroups(nodes, graphLayout).values()) {
		for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
			for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
				applyMemberCircleCollision(members[leftIndex], members[rightIndex], alpha);
			}
		}
	}
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

function hasExpandedOwnerSection(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return false;
		}

		visited.add(ownerSectionId);
		const ownerSection = graphLayout.sections[ownerSectionId];
		if (ownerSection && !ownerSection.collapsed) {
			return true;
		}

		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return false;
}

function getExpandedOwnerSectionId(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): string | null {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return null;
		}

		visited.add(ownerSectionId);
		const ownerSection = graphLayout.sections[ownerSectionId];
		if (ownerSection && !ownerSection.collapsed) {
			return ownerSectionId;
		}

		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return null;
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

function circleOverlapsRectangle(
	circleNode: FGNode,
	rectangle: RectangleCollisionRect,
): boolean {
	if (!isFiniteNumber(circleNode.x) || !isFiniteNumber(circleNode.y)) {
		return false;
	}

	const radius = getGraphCollisionRadius(circleNode);
	if (radius <= 0) {
		return false;
	}

	const closestX = clamp(circleNode.x, rectangle.x, rectangle.x + rectangle.width);
	const closestY = clamp(circleNode.y, rectangle.y, rectangle.y + rectangle.height);
	const deltaX = circleNode.x - closestX;
	const deltaY = circleNode.y - closestY;
	return deltaX * deltaX + deltaY * deltaY < radius * radius;
}

function hasActualCircleRectangleOverlap(
	left: FGNode,
	right: FGNode,
	leftRect: RectangleCollisionRect,
	rightRect: RectangleCollisionRect,
): boolean {
	if (isExpandedGraphSection(left) && !isExpandedGraphSection(right)) {
		return circleOverlapsRectangle(right, leftRect);
	}

	if (isExpandedGraphSection(right) && !isExpandedGraphSection(left)) {
		return circleOverlapsRectangle(left, rightRect);
	}

	return true;
}

function isExpandedGraphSection(node: FGNode): boolean {
	return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

function hasExpandedSectionCollisionParticipant(left: FGNode, right: FGNode): boolean {
	return isExpandedGraphSection(left) || isExpandedGraphSection(right);
}

function isDraggingCircleAgainstExpandedSection(left: FGNode, right: FGNode): boolean {
	const leftIsExpandedSection = isExpandedGraphSection(left);
	const rightIsExpandedSection = isExpandedGraphSection(right);
	if (leftIsExpandedSection && !rightIsExpandedSection) {
		return !!right.isDragging;
	}

	if (rightIsExpandedSection && !leftIsExpandedSection) {
		return !!left.isDragging;
	}

	return false;
}

function hasOwnedSectionMemberCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (left.isGraphSection && isOwnedBySection(right, left.id, graphLayout)) {
		return true;
	}

	return !!right.isGraphSection && isOwnedBySection(left, right.id, graphLayout);
}

function hasExpandedSectionMemberCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (left.isGraphSection && hasExpandedOwnerSection(right, graphLayout)) {
		return true;
	}

	return !!right.isGraphSection && hasExpandedOwnerSection(left, graphLayout);
}

function shouldApplyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (!hasExpandedSectionCollisionParticipant(left, right)) {
		return false;
	}

	if (isDraggingCircleAgainstExpandedSection(left, right)) {
		return false;
	}

	if (hasOwnedSectionMemberCollision(left, right, graphLayout)) {
		return false;
	}

	if (hasExpandedSectionMemberCollision(left, right, graphLayout)) {
		return false;
	}

	return true;
}

function inflateRectangleCollisionRect(
	rect: RectangleCollisionRect,
	padding: number,
): RectangleCollisionRect {
	if (padding <= 0) {
		return rect;
	}

	return {
		centerX: rect.centerX,
		centerY: rect.centerY,
		height: rect.height + padding * 2,
		width: rect.width + padding * 2,
		x: rect.x - padding,
		y: rect.y - padding,
	};
}

function getRepelAwareCollisionRect(
	node: FGNode,
	rect: RectangleCollisionRect,
	settings: GraphSectionBoundsForceOptions['settings'],
): RectangleCollisionRect {
	return inflateRectangleCollisionRect(rect, getSectionRectangleRepelPadding(node, rect, settings));
}

function getGraphChargeStrength(
	repelForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): (node: FGNode) => number {
	const defaultStrength = toD3Repel(repelForce);
	return (node: FGNode) => graphLayout && hasExpandedOwnerSection(node, graphLayout)
		? 0
		: defaultStrength * getSectionChargeMultiplier(node);
}

function getLinkEndpointId(endpoint: GraphLinkEndpoint): string | undefined {
	if (typeof endpoint === 'string') {
		return endpoint;
	}

	if (typeof endpoint === 'number') {
		return String(endpoint);
	}

	const id = endpoint?.id;
	return typeof id === 'number' ? String(id) : id;
}

function hasExpandedOwnerSectionById(
	nodeId: string | undefined,
	graphLayout: GraphLayoutSettings | undefined,
): boolean {
	if (!nodeId || !graphLayout) {
		return false;
	}

	return hasExpandedOwnerSection({ id: nodeId } as FGNode, graphLayout);
}

function getGraphLinkStrength(
	linkForce: number,
	graphLayout: GraphLayoutSettings | undefined,
): (link: GraphLinkLike) => number {
	return (link: GraphLinkLike) => {
		const sourceId = getLinkEndpointId(link.source);
		const targetId = getLinkEndpointId(link.target);
		return hasExpandedOwnerSectionById(sourceId, graphLayout)
			|| hasExpandedOwnerSectionById(targetId, graphLayout)
			? 0
			: linkForce;
	};
}

function getCollisionMoveWeight(node: FGNode): number {
	if (node.isDragging || node.isPinned) {
		return 0;
	}

	return 1;
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
	axis: CollisionAxis,
	direction: number,
	overlap: number,
): void {
	const leftIsSection = isExpandedGraphSection(left);
	const rightIsSection = isExpandedGraphSection(right);

	const leftWeight = getCollisionMoveWeight(left);
	const rightWeight = getCollisionMoveWeight(right);
	const totalWeight = leftWeight + rightWeight;
	if (totalWeight === 0) {
		return;
	}

	const correction = overlap;
	const leftShare = rightIsSection && !leftIsSection ? 1 : leftIsSection && !rightIsSection ? 0 : leftWeight / totalWeight;
	const rightShare = leftIsSection && !rightIsSection ? 1 : rightIsSection && !leftIsSection ? 0 : rightWeight / totalWeight;
	const leftCorrection = direction * correction * leftShare;
	const rightCorrection = -direction * correction * rightShare;

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
	axis: CollisionAxis,
	direction: number,
	overlap: number,
	alpha: number,
	impulseBudget: CollisionImpulseBudget,
): void {
	const leftWeight = getCollisionMoveWeight(left);
	const rightWeight = getCollisionMoveWeight(right);
	const totalWeight = leftWeight + rightWeight;
	if (totalWeight === 0) {
		return;
	}

	const impulse = overlap * SECTION_RECTANGLE_COLLISION_STRENGTH * alpha;
	const leftImpulse = capExternalSectionImpulse(
		left,
		right,
		axis,
		direction * impulse * (leftWeight / totalWeight),
		impulseBudget,
	);
	const rightImpulse = capExternalSectionImpulse(
		right,
		left,
		axis,
		-direction * impulse * (rightWeight / totalWeight),
		impulseBudget,
	);

	if (axis === 'x') {
		left.vx = (left.vx ?? 0) + leftImpulse;
		right.vx = (right.vx ?? 0) + rightImpulse;
		return;
	}

	left.vy = (left.vy ?? 0) + leftImpulse;
	right.vy = (right.vy ?? 0) + rightImpulse;
}

function capExternalSectionImpulse(
	node: FGNode,
	other: FGNode,
	axis: CollisionAxis,
	impulse: number,
	impulseBudget: CollisionImpulseBudget,
): number {
	if (!isExpandedGraphSection(node) || isExpandedGraphSection(other)) {
		return impulse;
	}

	const budgetKey = `${node.id}:${axis}`;
	const previousImpulse = impulseBudget.get(budgetKey) ?? 0;
	const nextImpulse = clamp(
		previousImpulse + impulse,
		-SECTION_EXTERNAL_COLLISION_MAX_IMPULSE,
		SECTION_EXTERNAL_COLLISION_MAX_IMPULSE,
	);
	impulseBudget.set(budgetKey, nextImpulse);
	return nextImpulse - previousImpulse;
}

function getRectangleCollisionOverlap(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
): RectangleCollisionOverlap | undefined {
	if (!shouldApplyRectangleCollision(left, right, graphLayout)) {
		return undefined;
	}

	const leftRect = getNodeRectangleCollisionRect(left);
	const rightRect = getNodeRectangleCollisionRect(right);
	if (!leftRect || !rightRect || !hasActualCircleRectangleOverlap(left, right, leftRect, rightRect)) {
		return undefined;
	}

	const leftCollisionRect = getRepelAwareCollisionRect(left, leftRect, settings);
	const rightCollisionRect = getRepelAwareCollisionRect(right, rightRect, settings);
	const overlapX = Math.min(leftCollisionRect.x + leftCollisionRect.width, rightCollisionRect.x + rightCollisionRect.width)
		- Math.max(leftCollisionRect.x, rightCollisionRect.x);
	const overlapY = Math.min(leftCollisionRect.y + leftCollisionRect.height, rightCollisionRect.y + rightCollisionRect.height)
		- Math.max(leftCollisionRect.y, rightCollisionRect.y);
	return overlapX <= 0 || overlapY <= 0
		? undefined
		: { leftRect, overlapX, overlapY, rightRect };
}

function applyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
	alpha: number,
	impulseBudget: CollisionImpulseBudget,
): void {
	const overlap = getRectangleCollisionOverlap(left, right, graphLayout, settings);
	if (!overlap) {
		return;
	}

	if (overlap.overlapX <= overlap.overlapY) {
		const direction = getCollisionDirection(left, right, overlap.leftRect.centerX, overlap.rightRect.centerX);
		applyRectangleCollisionPosition(left, right, 'x', direction, overlap.overlapX);
		applyRectangleCollisionVelocity(
			left,
			right,
			'x',
			direction,
			overlap.overlapX,
			alpha,
			impulseBudget,
		);
		return;
	}

	const direction = getCollisionDirection(left, right, overlap.leftRect.centerY, overlap.rightRect.centerY);
	applyRectangleCollisionPosition(left, right, 'y', direction, overlap.overlapY);
	applyRectangleCollisionVelocity(
		left,
		right,
		'y',
		direction,
		overlap.overlapY,
		alpha,
		impulseBudget,
	);
}

function applyRectangleCollisions(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	settings: GraphSectionBoundsForceOptions['settings'],
	alpha: number,
): void {
	const impulseBudget: CollisionImpulseBudget = new Map();
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

			applyRectangleCollision(nodes[leftIndex], nodes[rightIndex], graphLayout, settings, alpha, impulseBudget);
		}
	}
}

function getSectionDepth(
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): number {
	let depth = 0;
	let ownerSectionId = graphLayout.ownership[sectionId]?.ownerSectionId ?? null;
	const visited = new Set<string>([sectionId]);

	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return depth;
		}

		visited.add(ownerSectionId);
		depth += 1;
		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return depth;
}

function getSectionIdsByDepth(graphLayout: GraphLayoutSettings): string[] {
	return Object.keys(graphLayout.sections)
		.sort((left, right) => getSectionDepth(left, graphLayout) - getSectionDepth(right, graphLayout));
}

function getSectionCenter(node: FGNode | undefined): SectionCenter | undefined {
	if (!node || !isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
		return undefined;
	}

	return { x: node.x, y: node.y };
}

function translateNodePosition(node: FGNode, deltaX: number, deltaY: number): void {
	if (node.isDragging) {
		return;
	}

	if (isFiniteNumber(node.x)) {
		node.x += deltaX;
	}

	if (isFiniteNumber(node.y)) {
		node.y += deltaY;
	}

	if (isFiniteNumber(node.fx)) {
		node.fx += deltaX;
	}

	if (isFiniteNumber(node.fy)) {
		node.fy += deltaY;
	}
}

function getSectionCenterDelta(
	sectionId: string,
	nodeMap: Map<string, FGNode>,
	previousSectionCenters: Map<string, SectionCenter>,
): SectionCenter | undefined {
	const currentCenter = getSectionCenter(nodeMap.get(sectionId));
	const previousCenter = previousSectionCenters.get(sectionId);
	if (!currentCenter || !previousCenter) {
		return undefined;
	}

	const delta = {
		x: currentCenter.x - previousCenter.x,
		y: currentCenter.y - previousCenter.y,
	};
	return delta.x === 0 && delta.y === 0 ? undefined : delta;
}

function carryDirectSectionMembers(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	sectionId: string,
	delta: SectionCenter,
): void {
	for (const node of nodes) {
		if (node.id !== sectionId && getOwnerSectionId(node, graphLayout) === sectionId) {
			translateNodePosition(node, delta.x, delta.y);
		}
	}
}

function carrySectionMembersWithFrames(
	nodes: FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionCenters: Map<string, SectionCenter>,
): void {
	const nodeMap = createNodeMap(nodes);
	for (const sectionId of getSectionIdsByDepth(graphLayout)) {
		const delta = getSectionCenterDelta(sectionId, nodeMap, previousSectionCenters);
		if (delta) carryDirectSectionMembers(nodes, graphLayout, sectionId, delta);
	}
}

function rememberSectionCenters(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	previousSectionCenters: Map<string, SectionCenter>,
): void {
	const nodeMap = createNodeMap(nodes);
	previousSectionCenters.clear();
	for (const sectionId of Object.keys(graphLayout.sections)) {
		const center = getSectionCenter(nodeMap.get(sectionId));
		if (center) {
			previousSectionCenters.set(sectionId, center);
		}
	}
}

function getLinkEndpointNode(endpoint: FGLink['source'], nodeMap: Map<string, FGNode>): FGNode | undefined {
	return typeof endpoint === 'string'
		? nodeMap.get(endpoint)
		: endpoint;
}

function getBridgeMoveWeight(node: FGNode): number {
	return node.isDragging || node.isPinned ? 0 : 1;
}

function getBridgeWeightShares(source: FGNode, target: FGNode): CollisionWeightShares | undefined {
	const sourceWeight = getBridgeMoveWeight(source);
	const targetWeight = getBridgeMoveWeight(target);
	const totalWeight = sourceWeight + targetWeight;
	return totalWeight === 0
		? undefined
		: {
			left: sourceWeight / totalWeight,
			right: targetWeight / totalWeight,
		};
}

function applyLinkVelocity(
	source: FGNode,
	target: FGNode,
	linkDistance: number,
	linkForce: number,
	alpha: number,
): void {
	const weights = getBridgeWeightShares(source, target);
	if (!weights) {
		return;
	}

	const delta = getNodeDelta(source, target);
	const force = ((delta.distance - linkDistance) / delta.distance) * linkForce * alpha;
	addNodeVelocity(source, delta.x * force * weights.left, delta.y * force * weights.left);
	addNodeVelocity(target, -delta.x * force * weights.right, -delta.y * force * weights.right);
}

function hasBridgePhysicsSettings(
	links: readonly FGLink[],
	settings: Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> | undefined,
): settings is Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> {
	return !!settings && links.length > 0 && settings.linkForce !== 0;
}

function getLinkNodePair(link: FGLink, nodeMap: Map<string, FGNode>): [FGNode, FGNode] | undefined {
	const source = getLinkEndpointNode(link.source, nodeMap);
	const target = getLinkEndpointNode(link.target, nodeMap);
	return source && target ? [source, target] : undefined;
}

function touchesExpandedSectionMember(
	source: FGNode,
	target: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	return !!getExpandedOwnerSectionId(source, graphLayout)
		|| !!getExpandedOwnerSectionId(target, graphLayout);
}

function applySectionBridgeLinkForces(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	links: readonly FGLink[],
	settings: Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> | undefined,
	alpha: number,
): void {
	if (!hasBridgePhysicsSettings(links, settings)) {
		return;
	}

	const nodeMap = createNodeMap(nodes);
	for (const link of links) {
		const pair = getLinkNodePair(link, nodeMap);
		if (!pair) {
			continue;
		}

		const [source, target] = pair;
		if (!touchesExpandedSectionMember(source, target, graphLayout)) {
			continue;
		}

		applyLinkVelocity(source, target, settings.linkDistance, settings.linkForce, alpha);
	}
}

function constrainSectionMembers(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	sectionBounds: Map<string, BoundsRect>,
	alpha: number,
	sectionMemberCenterStrength: number,
): void {
	for (const node of nodes) {
		const ownerSectionId = getOwnerSectionId(node, graphLayout);
		if (node.isDragging || !ownerSectionId) {
			continue;
		}

		const bounds = sectionBounds.get(ownerSectionId);
		if (bounds) {
			constrainMemberNode(node, bounds, alpha, sectionMemberCenterStrength);
		}
	}
}

function applyGraphSectionBoundsTick(
	nodes: FGNode[],
	graphLayout: GraphLayoutSettings,
	options: GraphSectionBoundsForceOptions,
	previousSectionCenters: Map<string, SectionCenter>,
	alpha: number,
): void {
	applySectionBridgeLinkForces(nodes, graphLayout, options.links ?? [], options.settings, alpha);
	applyRectangleCollisions(nodes, graphLayout, options.settings, alpha);
	carrySectionMembersWithFrames(nodes, graphLayout, previousSectionCenters);
	const sectionBounds = createSectionBoundsMap(nodes, graphLayout);
	const sectionMemberCenterStrength = getSectionMemberCenterStrength(options.settings);
	constrainSectionMembers(nodes, graphLayout, sectionBounds, alpha, sectionMemberCenterStrength);
	applySectionMemberChargeForces(nodes, graphLayout, options.settings, alpha);
	applySectionMemberCollisions(nodes, graphLayout, alpha);
	constrainSectionMembers(nodes, graphLayout, sectionBounds, alpha, sectionMemberCenterStrength);
	rememberSectionCenters(nodes, graphLayout, previousSectionCenters);
}

export function createGraphSectionBoundsForce(
	graphLayout: GraphLayoutSettings,
	options: GraphSectionBoundsForceOptions = {},
): GraphSectionBoundsForce {
	let nodes: FGNode[] = [];
	const previousSectionCenters = new Map<string, SectionCenter>();

	const force = ((alpha: number): void => {
		applyGraphSectionBoundsTick(nodes, graphLayout, options, previousSectionCenters, alpha);
	}) as GraphSectionBoundsForce;

	force.initialize = (nextNodes: FGNode[]): void => {
		nodes = nextNodes;
		previousSectionCenters.clear();
	};

	return force;
}

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

function applyChargeSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const chargeForce = graph.d3Force('charge');
	if (hasStrength(chargeForce)) chargeForce.strength(getGraphChargeStrength(settings.repelForce, graphLayout));
	if (hasDistanceMax(chargeForce)) {
		chargeForce.distanceMax(DEFAULT_CHARGE_RANGE);
	}
}

function applyLinkSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const linkForce = graph.d3Force('link');
	if (hasDistanceAndStrength(linkForce)) {
		linkForce.distance(settings.linkDistance);
		linkForce.strength(getGraphLinkStrength(settings.linkForce, graphLayout));
	}
}

function applyCenterSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const strength = (node: FGNode): number => getRootGraphCenterStrength(node, settings.centerForce, graphLayout);
	const forceXInstance = graph.d3Force('forceX');
	if (hasStrength(forceXInstance)) forceXInstance.strength(strength);

	const forceYInstance = graph.d3Force('forceY');
	if (hasStrength(forceYInstance)) forceYInstance.strength(strength);
}

function applyCollisionSettings(
	graph: GraphPhysicsControls,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const collisionForce = graph.d3Force('collision');
	if (hasRadius(collisionForce)) {
		collisionForce.radius((node: FGNode) => getRootGraphCollisionRadius(node, graphLayout));
	}
}

export function applyPhysicsSettings(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsSectionOptions = { graphMode: '2d' },
): void {
	const graph = instance as GraphPhysicsControls;
	const graphLayout = options.graphMode === '2d' ? options.graphLayout : undefined;
	applyChargeSettings(graph, settings, graphLayout);
	applyLinkSettings(graph, settings, graphLayout);
	applyCenterSettings(graph, settings, graphLayout);
	applyCollisionSettings(graph, graphLayout);
	graph.d3ReheatSimulation();
}

export function initPhysics(
	instance: GraphPhysicsInstance,
	settings: IPhysicsSettings,
	options: GraphPhysicsSectionOptions = { graphMode: '2d' },
): void {
	const graph = instance as GraphPhysicsControls;
	const graphLayout = options.graphMode === '2d' ? options.graphLayout : undefined;
	applyPhysicsSettings(instance, settings, options);
	graph.d3Force(
		'forceX',
		forceX<FGNode>(0).strength(node => getRootGraphCenterStrength(node, settings.centerForce, graphLayout)),
	);
	graph.d3Force(
		'forceY',
		forceY<FGNode>(0).strength(node => getRootGraphCenterStrength(node, settings.centerForce, graphLayout)),
	);
	graph.d3Force(
		'collision',
		forceCollide<FGNode>(node => getRootGraphCollisionRadius(node, graphLayout)).iterations(COLLISION_ITERATIONS),
	);
	if (options.graphLayout || options.graphMode !== '2d') {
		applyGraphSectionBoundsForce(instance, { ...options, settings });
	}
	graph.d3ReheatSimulation();
}

export { syncPhysicsAnimation } from './use/physics/hook';
