import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../../model/build';
import {
  isPhysicsGraphReady,
  type ActivePhysicsGraph,
} from '../readiness';

export type PhysicsInitAction =
  | { type: 'skip' }
  | { type: 'wait' }
  | { instance: ActivePhysicsGraph; type: 'init' };

export function resolvePhysicsInitAction({
  fg2d,
  physicsInitialised,
}: {
  fg2d: FG2DMethods<FGNode, FGLink> | undefined;
  physicsInitialised: boolean;
}): PhysicsInitAction {
  if (physicsInitialised) return { type: 'skip' };
  if (!isPhysicsGraphReady(fg2d)) return { type: 'wait' };

  return {
    instance: fg2d,
    type: 'init',
  };
}
