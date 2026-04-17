import { useEffect, type MutableRefObject } from 'react';
import type { PhysicsRuntimeRefs } from './refs';
import { syncPhysicsAnimation } from '../../physics';
import { selectActivePhysicsGraph } from '../../physicsLifecycle/readiness';

interface UsePhysicsRuntimePauseOptions extends PhysicsRuntimeRefs {
  graphMode: '2d' | '3d';
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
}

export function usePhysicsRuntimePause({
  fg2dRef,
  fg3dRef,
  graphMode,
  physicsPaused,
  physicsInitialisedRef,
}: UsePhysicsRuntimePauseOptions): void {
  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !physicsInitialisedRef.current) return;

    syncPhysicsAnimation(graph, physicsPaused);
  }, [fg2dRef, fg3dRef, graphMode, physicsInitialisedRef, physicsPaused]);
}
