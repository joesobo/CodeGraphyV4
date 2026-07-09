import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { PhysicsRuntimeRefs } from './refs';
import { applyPhysicsSettings, syncPhysicsAnimation } from '../../../physics';
import { selectActivePhysicsGraph } from '../../../physicsLifecycle/readiness';
import { webviewGraphPerfLifecycle } from '../../../../../../perf/graph/lifecycle';

function recordLayoutReset(): void {
  webviewGraphPerfLifecycle.layoutReset();
}

interface UsePhysicsRuntimeLayoutResetOptions {
  graphMode: '2d' | '3d';
  physicsInitialisedRef: MutableRefObject<boolean>;
  pendingThreeDimensionalInitRef: MutableRefObject<boolean>;
  previousLayoutKeyRef: MutableRefObject<string | null>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

interface UsePhysicsRuntimeLayoutKeyOptions extends PhysicsRuntimeRefs {
  graphMode: '2d' | '3d';
  layoutKey: string;
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
  physicsSettingsRef: MutableRefObject<IPhysicsSettings>;
  previousLayoutKeyRef: MutableRefObject<string | null>;
  onLayoutReset?: (this: void) => void;
}

export function usePhysicsRuntimeLayoutReset({
  graphMode,
  physicsInitialisedRef,
  pendingThreeDimensionalInitRef,
  previousLayoutKeyRef,
  previousPhysicsRef,
}: UsePhysicsRuntimeLayoutResetOptions): void {
  useEffect(() => {
    physicsInitialisedRef.current = false;
    pendingThreeDimensionalInitRef.current = graphMode === '3d';
    previousLayoutKeyRef.current = null;
    previousPhysicsRef.current = null;
  }, [graphMode, physicsInitialisedRef, pendingThreeDimensionalInitRef, previousLayoutKeyRef, previousPhysicsRef]);
}

export function usePhysicsRuntimeLayoutKey({
  fg2dRef,
  fg3dRef,
  graphMode,
  layoutKey,
  physicsPaused,
  physicsInitialisedRef,
  physicsSettingsRef,
  previousLayoutKeyRef,
  onLayoutReset = recordLayoutReset,
}: UsePhysicsRuntimeLayoutKeyOptions): void {
  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !physicsInitialisedRef.current) {
      return;
    }

    if (previousLayoutKeyRef.current === null) {
      previousLayoutKeyRef.current = layoutKey;
      return;
    }

    if (previousLayoutKeyRef.current === layoutKey) {
      return;
    }

    previousLayoutKeyRef.current = layoutKey;
    onLayoutReset();
    applyPhysicsSettings(graph, physicsSettingsRef.current);
    if (physicsPaused) {
      syncPhysicsAnimation(graph, true);
    }
  }, [
    fg2dRef,
    fg3dRef,
    graphMode,
    layoutKey,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousLayoutKeyRef,
    onLayoutReset,
  ]);
}
