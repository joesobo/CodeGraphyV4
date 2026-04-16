import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { FGLink, FGNode } from '../../model/build';

export type ActivePhysicsGraph =
  | FG2DMethods<FGNode, FGLink>
  | FG3DMethods<FGNode, FGLink>;

interface PhysicsReadinessProbe {
  d3Force?(name: string): unknown;
  getGraphBbox?(): unknown;
}

export function selectActivePhysicsGraph(
  graphMode: '2d' | '3d',
  fg2d: FG2DMethods<FGNode, FGLink> | undefined,
  fg3d: FG3DMethods<FGNode, FGLink> | undefined,
): ActivePhysicsGraph | undefined {
  return graphMode === '2d' ? fg2d : fg3d;
}

export function isPhysicsGraphReady(
  graphMode: '2d' | '3d',
  graph: ActivePhysicsGraph | undefined,
): boolean {
  if (!graph) return false;
  if (graphMode === '2d') return true;

  try {
    const readinessProbe = graph as PhysicsReadinessProbe;
    if (typeof readinessProbe.d3Force !== 'function') {
      return false;
    }
    if (typeof readinessProbe.getGraphBbox !== 'function') {
      return false;
    }

    return readinessProbe.d3Force('charge') !== undefined
      && readinessProbe.d3Force('link') !== undefined
      && readinessProbe.getGraphBbox() !== null;
  } catch {
    return false;
  }
}
