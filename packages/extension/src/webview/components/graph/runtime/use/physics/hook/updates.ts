import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { PhysicsRuntimeRefs } from './refs';
import { applyPhysicsSettings } from '../../../physics';
import { shouldApplyPhysicsUpdate } from '../../../physicsLifecycle/updates';

interface UsePhysicsRuntimeUpdatesOptions extends PhysicsRuntimeRefs {
  physicsSettings: IPhysicsSettings;
  physicsInitialisedRef: MutableRefObject<boolean>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeUpdates({
  fg2dRef,
  physicsInitialisedRef,
  physicsSettings,
  previousPhysicsRef,
}: UsePhysicsRuntimeUpdatesOptions): void {
  useEffect(() => {
    const graph = fg2dRef.current;
    if (!graph || !shouldApplyPhysicsUpdate({
      graph,
      physicsInitialised: physicsInitialisedRef.current,
      physicsSettings,
      previousPhysics: previousPhysicsRef.current,
    })) return;

    previousPhysicsRef.current = { ...physicsSettings };
    applyPhysicsSettings(graph, physicsSettings);
  }, [fg2dRef, physicsInitialisedRef, physicsSettings, previousPhysicsRef]);
}
