import { useEffect, type MutableRefObject } from 'react';
import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { PhysicsRuntimeRefs } from './refs';
import { applyPhysicsSettings } from '../../../physics';
import { selectActivePhysicsGraph } from '../../../physicsLifecycle/readiness';
import { shouldApplyPhysicsUpdate } from '../../../physicsLifecycle/updates';

interface UsePhysicsRuntimeUpdatesOptions extends PhysicsRuntimeRefs {
  graphLayout?: GraphLayoutSettings;
  graphMode: '2d' | '3d';
  physicsSettings: IPhysicsSettings;
  physicsInitialisedRef: MutableRefObject<boolean>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeUpdates({
  fg2dRef,
  fg3dRef,
  graphLayout,
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
    if (graphLayout) {
      applyPhysicsSettings(graph, physicsSettings, { graphLayout, graphMode });
    } else {
      applyPhysicsSettings(graph, physicsSettings);
    }
  }, [
    fg2dRef,
    fg3dRef,
    graphLayout,
    graphMode,
    physicsInitialisedRef,
    physicsSettings,
    previousPhysicsRef,
  ]);
}
