import {
  createGraphLayoutEngine,
  graphNodeSizeChargeMultiplier,
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
} from '@codegraphy-dev/graph-renderer';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import { DEFAULT_NODE_SIZE, type FGLink, type FGNode } from '../../../model/build';
import { ownedNodeCollisionRadius } from './collisionRadius';

export interface OwnedGraphLayout {
  engine: GraphLayoutEngine;
  links: FGLink[];
  nodes: FGNode[];
}

function normalizedSetting(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

export function toOwnedPhysicsConfig(settings: IPhysicsSettings): Partial<GraphLayoutConfig> {
  const repelForce = normalizedSetting(settings.repelForce, 0, 20, 10);
  return {
    centralGravity: normalizedSetting(settings.centerForce, 0, 1, 0.1),
    chargeStrength: -(repelForce / 20) * 500,
    linkDistance: normalizedSetting(settings.linkDistance, 30, 500, 80),
    linkStrength: normalizedSetting(settings.linkForce, 0, 2, 1),
    velocityDecay: normalizedSetting(settings.damping, 0, 1, 0.4),
  };
}

function endpointId(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export function applyOwnedPhysicsSettings(
  engine: GraphLayoutEngine,
  settings: IPhysicsSettings,
): void {
  engine.setConfig(toOwnedPhysicsConfig(settings));
}

type OwnedGraphLayoutInput = GraphLayoutInput & {
  chargeStrengthMultipliers: Float32Array;
  flags: Uint8Array;
};

interface OwnedGraphLayoutData {
  input: OwnedGraphLayoutInput;
  resolvedLinks: FGLink[];
}

interface OwnedGraphNodeLayoutData {
  input: Omit<OwnedGraphLayoutInput, 'edgeSources' | 'edgeTargets'>;
  nodeIndexes: ReadonlyMap<string, number>;
}

function initialCoordinate(fixed: number | undefined, dynamic: number | undefined): number {
  const coordinate = Number.isFinite(fixed) ? fixed : dynamic;
  return Number.isFinite(coordinate) ? coordinate as number : Number.NaN;
}

function initialVelocity(velocity: number | undefined): number {
  return Number.isFinite(velocity) ? velocity as number : 0;
}

function chargeStrengthMultiplier(node: FGNode): number {
  return Number.isFinite(node.chargeStrengthMultiplier2D)
    ? Math.max(0, node.chargeStrengthMultiplier2D as number)
    : graphNodeSizeChargeMultiplier(node.size, DEFAULT_NODE_SIZE);
}

function nodeFlags(node: FGNode): number {
  return node.isPinned === true || node.isDragging === true ? GraphNodeFlag.Pinned : 0;
}

function buildOwnedGraphNodeLayoutData(nodes: FGNode[]): OwnedGraphNodeLayoutData {
  const initialX = new Float32Array(nodes.length);
  const initialY = new Float32Array(nodes.length);
  const initialVx = new Float32Array(nodes.length);
  const initialVy = new Float32Array(nodes.length);
  const chargeStrengthMultipliers = new Float32Array(nodes.length);
  const radii = new Float32Array(nodes.length);
  const flags = new Uint8Array(nodes.length);
  const nodeIds = new Array<string>(nodes.length);
  const nodeIndexes = new Map<string, number>();
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    nodeIds[index] = node.id;
    nodeIndexes.set(node.id, index);
    initialX[index] = initialCoordinate(node.fx, node.x);
    initialY[index] = initialCoordinate(node.fy, node.y);
    initialVx[index] = initialVelocity(node.vx);
    initialVy[index] = initialVelocity(node.vy);
    chargeStrengthMultipliers[index] = chargeStrengthMultiplier(node);
    radii[index] = ownedNodeCollisionRadius(node);
    flags[index] = nodeFlags(node);
  }
  return {
    input: {
      nodeIds,
      initialX,
      initialY,
      initialVx,
      initialVy,
      chargeStrengthMultipliers,
      radii,
      flags,
    },
    nodeIndexes,
  };
}

function resolveOwnedGraphLinks(
  nodes: FGNode[],
  links: FGLink[],
  nodeIndexes: ReadonlyMap<string, number>,
): Pick<OwnedGraphLayoutData, 'resolvedLinks'> & Pick<GraphLayoutInput, 'edgeSources' | 'edgeTargets'> {
  const resolvedLinks: FGLink[] = [];
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];
  for (const link of links) {
    const sourceIndex = nodeIndexes.get(endpointId(link.source));
    const targetIndex = nodeIndexes.get(endpointId(link.target));
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    link.source = nodes[sourceIndex];
    link.target = nodes[targetIndex];
    resolvedLinks.push(link);
    edgeSources.push(sourceIndex);
    edgeTargets.push(targetIndex);
  }
  return {
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
    resolvedLinks,
  };
}

function buildOwnedGraphLayoutData(nodes: FGNode[], links: FGLink[]): OwnedGraphLayoutData {
  const nodeData = buildOwnedGraphNodeLayoutData(nodes);
  const linkData = resolveOwnedGraphLinks(nodes, links, nodeData.nodeIndexes);
  return {
    input: {
      ...nodeData.input,
      edgeSources: linkData.edgeSources,
      edgeTargets: linkData.edgeTargets,
    },
    resolvedLinks: linkData.resolvedLinks,
  };
}

export function createOwnedGraphLayout(
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
): OwnedGraphLayout {
  const { input, resolvedLinks } = buildOwnedGraphLayoutData(nodes, links);
  const engine = createGraphLayoutEngine(input, toOwnedPhysicsConfig(settings));

  return { engine, links: resolvedLinks, nodes };
}

function sameBuffer(first: ArrayLike<number>, second: ArrayLike<number>): boolean {
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (!Object.is(first[index], second[index])) return false;
  }
  return true;
}

function preserveOwnedGraphNodeState(layout: OwnedGraphLayout, nodes: FGNode[]): void {
  const previousIndexes = new Map<string, number>();
  for (let index = 0; index < layout.engine.nodeIds.length; index += 1) {
    previousIndexes.set(layout.engine.nodeIds[index], index);
  }
  for (const node of nodes) {
    const index = previousIndexes.get(node.id);
    if (index === undefined) continue;
    node.x = layout.engine.x[index];
    node.y = layout.engine.y[index];
    node.vx = layout.engine.vx[index];
    node.vy = layout.engine.vy[index];
    if (layout.nodes[index]?.isDragging === true) {
      node.isDragging = true;
      node.fx = node.x;
      node.fy = node.y;
    }
  }
}

function sameTopology(engine: GraphLayoutEngine, input: GraphLayoutInput): boolean {
  return sameBuffer(engine.edgeSources, input.edgeSources)
    && sameBuffer(engine.edgeTargets, input.edgeTargets)
    && engine.nodeIds.length === input.nodeIds.length
    && engine.nodeIds.every((id, index) => id === input.nodeIds[index]);
}

function samePhysicsShape(
  engine: GraphLayoutEngine,
  input: OwnedGraphLayoutInput,
): boolean {
  return sameBuffer(engine.chargeStrengthMultipliers, input.chargeStrengthMultipliers)
    && sameBuffer(engine.radii, input.radii)
    && sameBuffer(engine.flags, input.flags);
}

export function updateOwnedGraphLayout(
  layout: OwnedGraphLayout,
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
): void {
  preserveOwnedGraphNodeState(layout, nodes);
  const { input, resolvedLinks } = buildOwnedGraphLayoutData(nodes, links);
  const graphShapeUnchanged = sameTopology(layout.engine, input)
    && samePhysicsShape(layout.engine, input);
  layout.nodes = nodes;
  layout.links = resolvedLinks;
  if (graphShapeUnchanged) return;
  layout.engine.setGraph(input);
  applyOwnedPhysicsSettings(layout.engine, settings);
}

export function syncOwnedLayoutNodesAtVersion(
  layout: OwnedGraphLayout,
  positionVersion: number,
  synchronizedVersion: number,
): number {
  if (synchronizedVersion === positionVersion) return synchronizedVersion;
  syncOwnedLayoutNodes(layout);
  return positionVersion;
}

export function syncOwnedLayoutNodes(layout: OwnedGraphLayout): void {
  for (let index = 0; index < layout.nodes.length; index += 1) {
    const node = layout.nodes[index];
    node.x = layout.engine.x[index];
    node.y = layout.engine.y[index];
    node.vx = layout.engine.vx[index];
    node.vy = layout.engine.vy[index];
  }
}
