import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { PhysicsRuntimeRefs } from './types';
import { applyPhysicsSettings } from '../../physics';
import { selectActivePhysicsGraph, shouldApplyPhysicsUpdate } from '../../physicsLifecycle';

interface UsePhysicsRuntimeUpdatesOptions extends PhysicsRuntimeRefs {
  graphMode: '2d' | '3d';
  physicsSettings: IPhysicsSettings;
  physicsInitialisedRef: MutableRefObject<boolean>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeUpdates({
  fg2dRef,
  fg3dRef,
  graphMode,
  physicsInitialisedRef,
  physicsSettings,
  previousPhysicsRef,
}: UsePhysicsRuntimeUpdatesOptions): void {
  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !shouldApplyPhysicsUpdate({
      graph,
      physicsInitialised: physicsInitialisedRef.current,
      physicsSettings,
      previousPhysics: previousPhysicsRef.current,
    })) return;

    previousPhysicsRef.current = { ...physicsSettings };
    applyPhysicsSettings(graph, physicsSettings);
  }, [
    fg2dRef,
    fg3dRef,
    graphMode,
    physicsInitialisedRef,
    physicsSettings,
    previousPhysicsRef,
  ]);
}
