import {
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
} from './physics/contracts';
import { createGraphLayoutEngine } from './physics/engine';
import type { DagMode } from '../../../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import { createOwnedDagTargets } from './dag';
import { ownedNodeCollisionRadius } from './collisionRadius';
import { createWorkerHostedGraphLayoutEngine } from './worker/host';

export { ownedNodeCollisionRadius } from './collisionRadius';

const WORKER_LAYOUT_NODE_THRESHOLD = 5_000;

export interface OwnedGraphLayout {
  engine: GraphLayoutEngine;
  kind: 'main-thread' | 'worker';
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

interface OwnedGraphLayoutData {
  input: GraphLayoutInput;
  resolvedLinks: FGLink[];
}

function buildOwnedGraphLayoutData(
  nodes: FGNode[],
  links: FGLink[],
  dagMode: DagMode,
  dagLevelDistance: number,
): OwnedGraphLayoutData {
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const initialX = new Float32Array(nodes.length);
  const initialY = new Float32Array(nodes.length);
  const initialVx = new Float32Array(nodes.length);
  const initialVy = new Float32Array(nodes.length);
  const chargeStrengthMultipliers = new Float32Array(nodes.length).fill(1);
  const radii = new Float32Array(nodes.length);
  const flags = new Uint8Array(nodes.length);
  initialX.fill(Number.NaN);
  initialY.fill(Number.NaN);

  nodes.forEach((node, index) => {
    const fixedX = Number.isFinite(node.fx) ? node.fx : node.x;
    const fixedY = Number.isFinite(node.fy) ? node.fy : node.y;
    if (Number.isFinite(fixedX) && Number.isFinite(fixedY)) {
      initialX[index] = fixedX as number;
      initialY[index] = fixedY as number;
    }
    initialVx[index] = Number.isFinite(node.vx) ? node.vx as number : 0;
    initialVy[index] = Number.isFinite(node.vy) ? node.vy as number : 0;
    radii[index] = ownedNodeCollisionRadius(node);
    if (Number.isFinite(node.chargeStrengthMultiplier2D)) {
      chargeStrengthMultipliers[index] = Math.max(0, node.chargeStrengthMultiplier2D as number);
    }
    if (node.isPinned === true || node.isDragging === true) {
      flags[index] |= GraphNodeFlag.Pinned;
    }
  });

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

  const dagTargets = createOwnedDagTargets(
    nodes.length,
    edgeSources,
    edgeTargets,
    dagMode,
    dagLevelDistance,
  );
  const input: GraphLayoutInput = {
    nodeIds: nodes.map((node) => node.id),
    initialX,
    initialY,
    initialVx,
    initialVy,
    chargeStrengthMultipliers,
    radii,
    flags,
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
    targetX: dagTargets?.targetX,
    targetY: dagTargets?.targetY,
  };
  return { input, resolvedLinks };
}

function shouldUseWorker(nodeCount: number, allowWorker: boolean): boolean {
  return allowWorker && nodeCount >= WORKER_LAYOUT_NODE_THRESHOLD && typeof Worker !== 'undefined';
}

export function createOwnedGraphLayout(
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
  dagMode: DagMode = null,
  dagLevelDistance = 60,
  onWorkerUpdate: () => void = () => undefined,
  allowWorker = true,
): OwnedGraphLayout {
  const { input, resolvedLinks } = buildOwnedGraphLayoutData(
    nodes,
    links,
    dagMode,
    dagLevelDistance,
  );
  const useWorker = shouldUseWorker(nodes.length, allowWorker);
  const engine = useWorker
    ? createWorkerHostedGraphLayoutEngine(input, onWorkerUpdate)
    : createGraphLayoutEngine(input);
  applyOwnedPhysicsSettings(engine, settings);
  engine.reheat();

  return { engine, kind: useWorker ? 'worker' : 'main-thread', links: resolvedLinks, nodes };
}

function sameBuffer(first: ArrayLike<number>, second: ArrayLike<number>): boolean {
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (!Object.is(first[index], second[index])) return false;
  }
  return true;
}

export function updateOwnedGraphLayout(
  layout: OwnedGraphLayout,
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
  dagMode: DagMode = null,
  dagLevelDistance = 60,
  allowWorker = true,
): boolean {
  const nextKind = shouldUseWorker(nodes.length, allowWorker) ? 'worker' : 'main-thread';
  if (nextKind !== layout.kind) return false;

  const previousIndexes = new Map(layout.engine.nodeIds.map((id, index) => [id, index]));
  for (const node of nodes) {
    const index = previousIndexes.get(node.id);
    if (index === undefined) continue;
    node.x = layout.engine.x[index];
    node.y = layout.engine.y[index];
    node.vx = layout.engine.vx[index];
    node.vy = layout.engine.vy[index];
    const previousNode = layout.nodes[index];
    if (previousNode?.isDragging === true) {
      node.isDragging = true;
      node.fx = node.x;
      node.fy = node.y;
    }
  }

  const { input, resolvedLinks } = buildOwnedGraphLayoutData(nodes, links, dagMode, dagLevelDistance);
  const topologyUnchanged = sameBuffer(layout.engine.edgeSources, input.edgeSources)
    && sameBuffer(layout.engine.edgeTargets, input.edgeTargets)
    && sameBuffer(layout.engine.targetX, input.targetX ?? new Float32Array(nodes.length).fill(Number.NaN))
    && sameBuffer(layout.engine.targetY, input.targetY ?? new Float32Array(nodes.length).fill(Number.NaN))
    && layout.engine.nodeIds.length === input.nodeIds.length
    && layout.engine.nodeIds.every((id, index) => id === input.nodeIds[index]);
  const physicsShapeUnchanged = sameBuffer(
    layout.engine.chargeStrengthMultipliers,
    input.chargeStrengthMultipliers ?? new Float32Array(nodes.length).fill(1),
  )
    && sameBuffer(layout.engine.radii, input.radii)
    && sameBuffer(layout.engine.flags, input.flags ?? new Uint8Array(nodes.length));

  layout.nodes = nodes;
  layout.links = resolvedLinks;
  if (!topologyUnchanged || !physicsShapeUnchanged) {
    layout.engine.setGraph(input);
    applyOwnedPhysicsSettings(layout.engine, settings);
    layout.engine.reheat();
  }
  syncOwnedLayoutNodes(layout);
  return true;
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
