import { useEffect, type MutableRefObject } from 'react';
import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../../model/build';
import type { PhysicsRuntimeRefs } from './refs';
import { applyGraphSectionBoundsForce, applyPhysicsSettings } from '../../../physics';
import { selectActivePhysicsGraph } from '../../../physicsLifecycle/readiness';
import { shouldApplyPhysicsUpdate } from '../../../physicsLifecycle/updates';

interface UsePhysicsRuntimeUpdatesOptions extends PhysicsRuntimeRefs {
  graphDataRef?: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphLayout?: GraphLayoutSettings;
  graphMode: '2d' | '3d';
  physicsSettings: IPhysicsSettings;
  physicsInitialisedRef: MutableRefObject<boolean>;
  previousPhysicsRef: MutableRefObject<IPhysicsSettings | null>;
}

export function usePhysicsRuntimeUpdates({
  fg2dRef,
  fg3dRef,
  graphDataRef,
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
      applyGraphSectionBoundsForce(graph, {
        graphLayout,
        graphMode,
        links: graphDataRef?.current.links,
        settings: physicsSettings,
      });
      applyPhysicsSettings(graph, physicsSettings, { graphLayout, graphMode });
    } else {
      applyPhysicsSettings(graph, physicsSettings);
    }
  }, [
    fg2dRef,
    fg3dRef,
    graphDataRef,
    graphLayout,
    graphMode,
    physicsInitialisedRef,
    physicsSettings,
    previousPhysicsRef,
  ]);
}
