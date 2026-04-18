import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { FGLink, FGNode } from '../../model/build';
import {
  isPhysicsGraphReady,
  selectActivePhysicsGraph,
  type ActivePhysicsGraph,
} from './readiness';

export type PhysicsInitAction =
  | { type: 'skip' }
  | { type: 'wait' }
  | { instance: ActivePhysicsGraph; type: 'init' };

export function resolvePhysicsInitAction({
  fg2d,
  fg3d,
  graphMode,
  physicsInitialised,
}: {
  fg2d: FG2DMethods<FGNode, FGLink> | undefined;
  fg3d: FG3DMethods<FGNode, FGLink> | undefined;
  graphMode: '2d' | '3d';
  physicsInitialised: boolean;
}): PhysicsInitAction {
  if (physicsInitialised) return { type: 'skip' };

  const instance = selectActivePhysicsGraph(graphMode, fg2d, fg3d);
  if (!isPhysicsGraphReady(graphMode, instance)) return { type: 'wait' };

  return {
    instance: instance!,
    type: 'init',
  };
}
