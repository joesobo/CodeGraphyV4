import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import { initPhysics, syncPhysicsAnimation } from '../../../physics';
import { resolvePhysicsInitAction } from '../../../physicsLifecycle/init/action';
import type { PhysicsRuntimeRefs } from './refs';

interface UsePhysicsRuntimeInitOptions extends PhysicsRuntimeRefs {
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
  physicsSettingsRef: MutableRefObject<IPhysicsSettings>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeInit({
  fg2dRef,
  physicsInitialisedRef,
  physicsPaused,
  physicsSettingsRef,
  previousPhysicsRef,
}: UsePhysicsRuntimeInitOptions): void {
  useEffect(() => {
    let frame: number | null = null;

    const tryInit = (): void => {
      const action = resolvePhysicsInitAction({
        fg2d: fg2dRef.current,
        physicsInitialised: physicsInitialisedRef.current,
      });
      if (action.type === 'skip') return;
      if (action.type === 'init') {
        physicsInitialisedRef.current = true;
        previousPhysicsRef.current = { ...physicsSettingsRef.current };
        initPhysics(action.instance, physicsSettingsRef.current);
        if (physicsPaused) syncPhysicsAnimation(action.instance, true);
        return;
      }

      frame = requestAnimationFrame(tryInit);
    };

    tryInit();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [
    fg2dRef,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousPhysicsRef,
  ]);
}
