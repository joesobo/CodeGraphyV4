import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../model/build';

export type ActivePhysicsGraph = FG2DMethods<FGNode, FGLink>;

export function isPhysicsGraphReady(
  graph: ActivePhysicsGraph | undefined,
): graph is ActivePhysicsGraph {
  return graph !== undefined;
}
