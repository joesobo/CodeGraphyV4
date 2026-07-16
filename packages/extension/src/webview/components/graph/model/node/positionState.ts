import type { IGraphNode } from '../../../../../shared/graph/contracts';
import type { FGNode } from '../build';

export interface PreviousNodeState { fx: number | undefined; fy: number | undefined; vx: number | undefined; vy: number | undefined; x: number | undefined; y: number | undefined }
export type GraphNodePositionState = PreviousNodeState;

export function createPreviousNodeStateMap(previousNodes: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'vx' | 'vy' | 'x' | 'y'>>): Map<string, PreviousNodeState> {
  return new Map(previousNodes.map(node => [node.id, { fx: node.fx, fy: node.fy, vx: node.vx, vy: node.vy, x: node.x, y: node.y }]));
}

function positionNumber(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function createGraphNodePositionState(node: IGraphNode, previous: PreviousNodeState | undefined): GraphNodePositionState {
  const runtime = node as IGraphNode & { fx?: unknown; fy?: unknown; vx?: unknown; vy?: unknown };
  return { fx: positionNumber(runtime.fx, previous?.fx), fy: positionNumber(runtime.fy, previous?.fy),
    vx: positionNumber(runtime.vx, previous?.vx), vy: positionNumber(runtime.vy, previous?.vy),
    x: node.x ?? previous?.x, y: node.y ?? previous?.y };
}
