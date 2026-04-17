import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import { initPhysics, syncPhysicsAnimation } from '../../../physics';
import { resolvePhysicsInitAction } from '../../../physicsLifecycle/init';
import type { PhysicsRuntimeRefs } from './refs';

interface UsePhysicsRuntimeInitOptions extends PhysicsRuntimeRefs {
  graphMode: '2d' | '3d';
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
  physicsSettingsRef: MutableRefObject<IPhysicsSettings>;
  pendingThreeDimensionalInitRef: MutableRefObject<boolean>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeInit({
  fg2dRef,
  fg3dRef,
  graphMode,
  pendingThreeDimensionalInitRef,
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
        fg3d: fg3dRef.current,
        graphMode,
        physicsInitialised: physicsInitialisedRef.current,
      });
      if (action.type === 'skip') return;
      if (action.type === 'init') {
        if (graphMode === '3d' && pendingThreeDimensionalInitRef.current) {
          // The 3d ref becomes available before the underlying force layout is ready
          // to be reheated. Deferring one extra frame avoids calling d3ReheatSimulation
          // before three-forcegraph assigns state.layout.
          pendingThreeDimensionalInitRef.current = false;
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(tryInit);
          });
          return;
        }

        physicsInitialisedRef.current = true;
        previousPhysicsRef.current = { ...physicsSettingsRef.current };
        initPhysics(action.instance, physicsSettingsRef.current);
        if (physicsPaused) {
          syncPhysicsAnimation(action.instance, true);
        }
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
    fg3dRef,
    graphMode,
    pendingThreeDimensionalInitRef,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousPhysicsRef,
  ]);
}
