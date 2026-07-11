import {
  createGraphLayoutEngine,
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
} from './physics';
import type { DagMode } from '../../../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import { createOwnedDagTargets } from './dag';
import { createWorkerHostedGraphLayoutEngine } from './worker/host';

const WORKER_LAYOUT_NODE_THRESHOLD = 10_000;

export interface OwnedGraphLayout {
  engine: GraphLayoutEngine;
  kind: 'main-thread' | 'worker';
  links: FGLink[];
  nodes: FGNode[];
}

export function ownedNodeCollisionRadius(node: FGNode): number {
  if (Number.isFinite(node.collisionRadius2D)) {
    return Math.max(1, node.collisionRadius2D as number);
  }
  if (node.shapeSize2D) {
    return Math.max(1, Math.hypot(node.shapeSize2D.width, node.shapeSize2D.height) / 2);
  }
  return Math.max(1, node.size ?? 4);
}

function normalizedSetting(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

export function toOwnedPhysicsConfig(settings: IPhysicsSettings): Partial<GraphLayoutConfig> {
  return {
    centerForce: normalizedSetting(settings.centerForce, 0, 1, 0.1),
    damping: 1 - normalizedSetting(settings.damping, 0, 1, 0.7),
    linkDistance: normalizedSetting(settings.linkDistance, 30, 500, 80),
    linkForce: normalizedSetting(settings.linkForce, 0, 1, 0.15),
    repelForce: normalizedSetting(settings.repelForce, 0, 20, 10) * 120,
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

export function createOwnedGraphLayout(
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
  dagMode: DagMode = null,
  dagLevelDistance = 60,
  onWorkerUpdate: () => void = () => undefined,
): OwnedGraphLayout {
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const initialX = new Float32Array(nodes.length);
  const initialY = new Float32Array(nodes.length);
  const initialVx = new Float32Array(nodes.length);
  const initialVy = new Float32Array(nodes.length);
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
    if (node.isPinned === true) flags[index] |= GraphNodeFlag.Pinned;
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
  const input = {
    nodeIds: nodes.map((node) => node.id),
    initialX,
    initialY,
    initialVx,
    initialVy,
    radii,
    flags,
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
    targetX: dagTargets?.targetX,
    targetY: dagTargets?.targetY,
  };
  const useWorker = nodes.length >= WORKER_LAYOUT_NODE_THRESHOLD && typeof Worker !== 'undefined';
  const engine = useWorker
    ? createWorkerHostedGraphLayoutEngine(input, onWorkerUpdate)
    : createGraphLayoutEngine(input);
  applyOwnedPhysicsSettings(engine, settings);
  engine.reheat();

  return { engine, kind: useWorker ? 'worker' : 'main-thread', links: resolvedLinks, nodes };
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
