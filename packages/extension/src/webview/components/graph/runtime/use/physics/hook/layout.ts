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
  previousResetVersionRef?: MutableRefObject<number | null>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

interface UsePhysicsRuntimeLayoutKeyOptions extends PhysicsRuntimeRefs {
  graphMode: '2d' | '3d';
  layoutKey: string;
  resetVersion?: number;
  structureVersion?: number;
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
  physicsSettingsRef: MutableRefObject<IPhysicsSettings>;
  previousLayoutKeyRef: MutableRefObject<string | null>;
  previousResetVersionRef?: MutableRefObject<number | null>;
  onLayoutReset?: (this: void) => void;
}

export function usePhysicsRuntimeLayoutReset({
  graphMode,
  physicsInitialisedRef,
  pendingThreeDimensionalInitRef,
  previousLayoutKeyRef,
  previousResetVersionRef,
  previousPhysicsRef,
}: UsePhysicsRuntimeLayoutResetOptions): void {
  useEffect(() => {
    physicsInitialisedRef.current = false;
    pendingThreeDimensionalInitRef.current = graphMode === '3d';
    previousLayoutKeyRef.current = null;
    if (previousResetVersionRef) previousResetVersionRef.current = null;
    previousPhysicsRef.current = null;
  }, [graphMode, physicsInitialisedRef, pendingThreeDimensionalInitRef, previousLayoutKeyRef, previousPhysicsRef, previousResetVersionRef]);
}

export function usePhysicsRuntimeLayoutKey({
  fg2dRef,
  fg3dRef,
  graphMode,
  layoutKey,
  resetVersion,
  structureVersion,
  physicsPaused,
  physicsInitialisedRef,
  physicsSettingsRef,
  previousLayoutKeyRef,
  previousResetVersionRef,
  onLayoutReset = recordLayoutReset,
}: UsePhysicsRuntimeLayoutKeyOptions): void {
  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !physicsInitialisedRef.current) {
      return;
    }

    if (previousLayoutKeyRef.current === null) {
      previousLayoutKeyRef.current = layoutKey;
      if (previousResetVersionRef) previousResetVersionRef.current = resetVersion ?? null;
      return;
    }

    const layoutChanged = previousLayoutKeyRef.current !== layoutKey;
    const resetChanged = resetVersion === undefined
      ? layoutChanged
      : previousResetVersionRef?.current !== resetVersion;
    if (!layoutChanged && !resetChanged) {
      return;
    }

    previousLayoutKeyRef.current = layoutKey;
    if (previousResetVersionRef) previousResetVersionRef.current = resetVersion ?? null;
    if (resetChanged) {
      onLayoutReset();
      applyPhysicsSettings(graph, physicsSettingsRef.current);
      if (physicsPaused) {
        syncPhysicsAnimation(graph, true);
      }
      return;
    }
    graph.d3ReheatSimulation?.();
  }, [
    fg2dRef,
    fg3dRef,
    graphMode,
    layoutKey,
    resetVersion,
    structureVersion,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousLayoutKeyRef,
    previousResetVersionRef,
    onLayoutReset,
  ]);
}
