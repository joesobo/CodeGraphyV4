import {
  createGraphLayoutEngine,
  type GraphLayoutEngine,
} from '@codegraphy-dev/graph-engine';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';

export interface OwnedGraphLayout {
  engine: GraphLayoutEngine;
  links: FGLink[];
  nodes: FGNode[];
}

function nodeRadius(node: FGNode): number {
  return Math.max(1, node.collisionRadius2D ?? node.size ?? 4);
}

function endpointId(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export function applyOwnedPhysicsSettings(
  engine: GraphLayoutEngine,
  settings: IPhysicsSettings,
): void {
  engine.setConfig({
    centerForce: settings.centerForce,
    damping: settings.damping,
    linkDistance: Math.max(1, settings.linkDistance),
    linkForce: settings.linkForce,
    repelForce: Math.max(0, settings.repelForce) * 120,
  });
}

export function createOwnedGraphLayout(
  nodes: FGNode[],
  links: FGLink[],
  settings: IPhysicsSettings,
): OwnedGraphLayout {
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const initialX = new Float32Array(nodes.length);
  const initialY = new Float32Array(nodes.length);
  const radii = new Float32Array(nodes.length);
  initialX.fill(Number.NaN);
  initialY.fill(Number.NaN);

  nodes.forEach((node, index) => {
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      initialX[index] = node.x as number;
      initialY[index] = node.y as number;
    }
    radii[index] = nodeRadius(node);
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

  const engine = createGraphLayoutEngine({
    nodeIds: nodes.map((node) => node.id),
    initialX,
    initialY,
    radii,
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
  });
  applyOwnedPhysicsSettings(engine, settings);
  engine.reheat();

  return { engine, links: resolvedLinks, nodes };
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
