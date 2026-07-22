import { graphNodeSizeChargeMultiplier, GraphNodeFlag, type GraphLayoutInput } from '@codegraphy-dev/graph-renderer';
import { DEFAULT_NODE_SIZE, type FGLink, type FGNode } from '../../../../../model/build';
import { ownedNodeCollisionRadius } from '../collision/radius';

export type OwnedGraphLayoutInput = GraphLayoutInput & { chargeStrengthMultipliers: Float32Array; flags: Uint8Array };
export interface OwnedGraphLayoutData { input: OwnedGraphLayoutInput; resolvedLinks: FGLink[] }

function coordinate(fixed: number | undefined, dynamic: number | undefined): number {
  const value = Number.isFinite(fixed) ? fixed : dynamic;
  return Number.isFinite(value) ? value as number : Number.NaN;
}

function chargeMultiplier(node: FGNode): number {
  return Number.isFinite(node.chargeStrengthMultiplier2D)
    ? Math.max(0, node.chargeStrengthMultiplier2D as number)
    : graphNodeSizeChargeMultiplier(node.size, DEFAULT_NODE_SIZE);
}

function buildNodeInput(nodes: FGNode[]) {
  const nodeIds = nodes.map(node => node.id);
  return {
    nodeIds,
    nodeIndexes: new Map(nodeIds.map((id, index) => [id, index])),
    initialX: Float32Array.from(nodes, node => coordinate(node.fx, node.x)),
    initialY: Float32Array.from(nodes, node => coordinate(node.fy, node.y)),
    initialVx: Float32Array.from(nodes, node => Number.isFinite(node.vx) ? node.vx as number : 0),
    initialVy: Float32Array.from(nodes, node => Number.isFinite(node.vy) ? node.vy as number : 0),
    chargeStrengthMultipliers: Float32Array.from(nodes, chargeMultiplier),
    radii: Float32Array.from(nodes, ownedNodeCollisionRadius),
    flags: Uint8Array.from(nodes, node => node.isPinned === true || node.isDragging === true ? GraphNodeFlag.Pinned : 0),
  };
}

function endpointId(endpoint: string | FGNode): string { return typeof endpoint === 'string' ? endpoint : endpoint.id; }

export function buildOwnedGraphLayoutData(nodes: FGNode[], links: FGLink[]): OwnedGraphLayoutData {
  const { nodeIndexes, ...nodeInput } = buildNodeInput(nodes);
  const resolvedLinks: FGLink[] = [];
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];
  for (const link of links) {
    const source = nodeIndexes.get(endpointId(link.source));
    const target = nodeIndexes.get(endpointId(link.target));
    if (source === undefined || target === undefined) continue;
    link.source = nodes[source]; link.target = nodes[target]; resolvedLinks.push(link);
    edgeSources.push(source); edgeTargets.push(target);
  }
  return { input: { ...nodeInput, edgeSources: Uint32Array.from(edgeSources), edgeTargets: Uint32Array.from(edgeTargets) }, resolvedLinks };
}
