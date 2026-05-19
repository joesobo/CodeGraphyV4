import { useEffect, useRef, type MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import { applyGraphSectionBoundsForce, applyPhysicsSettings } from '../../physics';
import {
  createGraphViewForceAdapterState,
  syncGraphViewForceAdapters,
} from '../../physics/pluginForces';
import type { GraphPhysicsControls } from '../../physics/model';
import { usePhysicsRuntimeInit } from './hook/init';
import { usePhysicsRuntimeLayoutKey, usePhysicsRuntimeLayoutReset } from './hook/layout';
import { usePhysicsRuntimePause } from './hook/pause';
import { usePhysicsRuntimeUpdates } from './hook/updates';
import { selectActivePhysicsGraph } from '../../physicsLifecycle/readiness';

interface GraphPhysicsAnimationControls {
	d3ReheatSimulation?(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

interface UsePhysicsRuntimeProps {
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  graphDataRef?: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphLayout?: GraphLayoutSettings;
  graphViewContributions?: CoreGraphViewContributionSet;
  graphMode: '2d' | '3d';
  layoutKey: string;
  physicsPaused?: boolean;
  physicsSettings: IPhysicsSettings;
}

export function usePhysicsRuntime({
  fg2dRef,
  fg3dRef,
  graphDataRef,
  graphLayout,
  graphViewContributions,
  graphMode,
  layoutKey,
  physicsPaused = false,
  physicsSettings,
}: UsePhysicsRuntimeProps): void {
  const physicsInitialisedRef = useRef(false);
  const physicsSettingsRef = useRef(physicsSettings);
  const pendingThreeDimensionalInitRef = useRef(graphMode === '3d');
  const previousPhysicsRef = useRef<IPhysicsSettings | null>(null);
  const previousLayoutKeyRef = useRef<string | null>(null);
  const previousSectionLayoutRef = useRef<GraphLayoutSettings | undefined>(undefined);
  const forceAdapterStateRef = useRef(createGraphViewForceAdapterState());

  physicsSettingsRef.current = physicsSettings;

  usePhysicsRuntimeUpdates({
    fg2dRef,
    fg3dRef,
    graphDataRef,
    graphLayout,
    graphMode,
    physicsInitialisedRef,
    physicsSettings,
    previousPhysicsRef,
  });

	  usePhysicsRuntimePause({
	    fg2dRef,
	    fg3dRef,
	    graphMode,
	    physicsInitialisedRef,
	    physicsPaused,
	  });

  usePhysicsRuntimeLayoutReset({
    graphMode,
    physicsInitialisedRef,
    pendingThreeDimensionalInitRef,
    previousLayoutKeyRef,
    previousPhysicsRef,
  });

	  usePhysicsRuntimeInit({
	    fg2dRef,
	    fg3dRef,
	    graphDataRef,
	    graphMode,
    graphLayout,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    pendingThreeDimensionalInitRef,
    previousPhysicsRef,
  });

  usePhysicsRuntimeLayoutKey({
    fg2dRef,
    fg3dRef,
    graphLayout,
    graphMode,
    layoutKey,
    physicsPaused,
    physicsInitialisedRef,
    physicsSettingsRef,
    previousLayoutKeyRef,
  });

  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !physicsInitialisedRef.current || typeof graph.d3Force !== 'function') {
      return;
    }

    syncGraphViewForceAdapters(
      graph as GraphPhysicsControls,
      forceAdapterStateRef.current,
      graphViewContributions,
      graphDataRef?.current ?? { nodes: [], links: [] },
    );
  }, [fg2dRef, fg3dRef, graphDataRef, graphMode, graphViewContributions, layoutKey, physicsInitialisedRef]);

  useEffect(() => {
    const fg2d = fg2dRef.current;
    const fg3d = fg3dRef.current;
    const forceAdapterState = forceAdapterStateRef.current;
    const graphData = graphDataRef?.current ?? { nodes: [], links: [] };

    return () => {
      const graph = selectActivePhysicsGraph(graphMode, fg2d, fg3d);
      if (!graph || typeof graph.d3Force !== 'function') {
        return;
      }

      syncGraphViewForceAdapters(
        graph as GraphPhysicsControls,
        forceAdapterState,
        undefined,
        graphData,
      );
    };
  }, [fg2dRef, fg3dRef, graphDataRef, graphMode]);

  useEffect(() => {
    const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
    if (!graph || !physicsInitialisedRef.current) {
      return;
    }

    const hadSectionLayout = previousSectionLayoutRef.current !== undefined;
    previousSectionLayoutRef.current = graphLayout;
    if (!graphLayout) {
      if (hadSectionLayout) {
        applyGraphSectionBoundsForce(graph, {
          graphLayout: undefined,
          graphMode,
          links: graphDataRef?.current.links,
          settings: physicsSettingsRef.current,
        });
        applyPhysicsSettings(graph, physicsSettingsRef.current);
      }
      return;
    }

    applyGraphSectionBoundsForce(graph, {
      graphLayout,
      graphMode,
      links: graphDataRef?.current.links,
      settings: physicsSettingsRef.current,
    });
    applyPhysicsSettings(graph, physicsSettingsRef.current, { graphLayout, graphMode });
  }, [fg2dRef, fg3dRef, graphDataRef, graphLayout, graphMode, physicsInitialisedRef, physicsSettingsRef]);
}

export function syncPhysicsAnimation(
	instance: GraphPhysicsAnimationControls,
	physicsPaused: boolean,
): void {
	if (physicsPaused) {
		instance.pauseAnimation?.();
	} else {
		instance.resumeAnimation?.();
	}

	instance.d3ReheatSimulation?.();
}
