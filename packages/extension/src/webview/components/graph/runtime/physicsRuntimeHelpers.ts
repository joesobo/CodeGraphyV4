import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../shared/contracts';
import type { FGLink, FGNode } from '../../graphModel';
import { havePhysicsSettingsChanged } from './physics';

export type ActivePhysicsGraph =
  | FG2DMethods<FGNode, FGLink>
  | FG3DMethods<FGNode, FGLink>;

export type PhysicsInitAction =
  | { type: 'skip' }
  | { type: 'wait' }
  | { instance: ActivePhysicsGraph; type: 'init' };

export function selectActivePhysicsGraph(
  graphMode: '2d' | '3d',
  fg2d: FG2DMethods<FGNode, FGLink> | undefined,
  fg3d: FG3DMethods<FGNode, FGLink> | undefined,
): ActivePhysicsGraph | undefined {
  return graphMode === '2d' ? fg2d : fg3d;
}

export function shouldApplyPhysicsUpdate({
  graph,
  haveSettingsChanged = havePhysicsSettingsChanged,
  physicsInitialised,
  physicsSettings,
  previousPhysics,
}: {
  graph: ActivePhysicsGraph | undefined;
  haveSettingsChanged?: (
    previous: IPhysicsSettings | null,
    next: IPhysicsSettings,
  ) => boolean;
  physicsInitialised: boolean;
  physicsSettings: IPhysicsSettings;
  previousPhysics: IPhysicsSettings | null;
}): boolean {
  if (!graph || !physicsInitialised) return false;
  return haveSettingsChanged(previousPhysics, physicsSettings);
}

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
  if (!instance) return { type: 'wait' };

  return {
    instance,
    type: 'init',
  };
}
