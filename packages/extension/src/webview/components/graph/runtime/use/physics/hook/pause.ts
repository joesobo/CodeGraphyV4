import { useEffect, type MutableRefObject } from 'react';
import type { PhysicsRuntimeRefs } from './refs';
import { syncPhysicsAnimation } from '../../../physics';

interface UsePhysicsRuntimePauseOptions extends PhysicsRuntimeRefs {
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
}

export function usePhysicsRuntimePause({
  fg2dRef,
  physicsPaused,
  physicsInitialisedRef,
}: UsePhysicsRuntimePauseOptions): void {
  useEffect(() => {
    const graph = fg2dRef.current;
    if (!graph || !physicsInitialisedRef.current) return;

    syncPhysicsAnimation(graph, physicsPaused);
  }, [fg2dRef, physicsInitialisedRef, physicsPaused]);
}
