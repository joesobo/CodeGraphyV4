import { useEffect, useRef, type MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import {
  createGraphViewForceAdapterState,
  syncGraphViewForceAdapters,
} from '../../physics/pluginForces';
import type { GraphPhysicsControls } from '../../physics/model';
import { usePhysicsRuntimeInit } from './hook/init';
import { usePhysicsRuntimeLayoutKey } from './hook/layout';
import { usePhysicsRuntimePause } from './hook/pause';
import { usePhysicsRuntimeUpdates } from './hook/updates';

interface GraphPhysicsAnimationControls {
  d3ReheatSimulation?(): void;
  pauseAnimation?(): void;
  resumeAnimation?(): void;
}

interface UsePhysicsRuntimeProps {
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  graphDataRef?: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphViewContributions?: CoreGraphViewContributionSet;
  layoutKey: string;
  physicsPaused?: boolean;
  physicsSettings: IPhysicsSettings;
}

export function usePhysicsRuntime({
  fg2dRef,
  graphDataRef,
  graphViewContributions,
  layoutKey,
  physicsPaused = false,
  physicsSettings,
}: UsePhysicsRuntimeProps): void {
  const physicsInitialisedRef = useRef(false);
  const physicsSettingsRef = useRef(physicsSettings);
  const previousPhysicsRef = useRef<IPhysicsSettings | null>(null);
  const previousLayoutKeyRef = useRef<string | null>(null);
  const forceAdapterStateRef = useRef(createGraphViewForceAdapterState());

  physicsSettingsRef.current = physicsSettings;

  usePhysicsRuntimeUpdates({
    fg2dRef,
    physicsInitialisedRef,
    physicsSettings,
    previousPhysicsRef,
  });

  usePhysicsRuntimePause({
    fg2dRef,
    physicsInitialisedRef,
    physicsPaused,
  });

  usePhysicsRuntimeInit({
    fg2dRef,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousPhysicsRef,
  });

  usePhysicsRuntimeLayoutKey({
    fg2dRef,
    layoutKey,
    physicsPaused,
    physicsInitialisedRef,
    physicsSettingsRef,
    previousLayoutKeyRef,
  });

  useEffect(() => {
    const graph = fg2dRef.current;
    if (!graph || !physicsInitialisedRef.current || typeof graph.d3Force !== 'function') return;

    syncGraphViewForceAdapters(
      graph as GraphPhysicsControls,
      forceAdapterStateRef.current,
      graphViewContributions,
      graphDataRef?.current ?? { nodes: [], links: [] },
      { physicsSettings },
    );
  }, [fg2dRef, graphDataRef, graphViewContributions, layoutKey, physicsSettings]);

  useEffect(() => {
    const graph = fg2dRef.current;
    const forceAdapterState = forceAdapterStateRef.current;
    const graphData = graphDataRef?.current ?? { nodes: [], links: [] };

    return () => {
      if (!graph || typeof graph.d3Force !== 'function') return;
      syncGraphViewForceAdapters(
        graph as GraphPhysicsControls,
        forceAdapterState,
        undefined,
        graphData,
      );
    };
  }, [fg2dRef, graphDataRef]);
}

export function syncPhysicsAnimation(
  instance: GraphPhysicsAnimationControls,
  physicsPaused: boolean,
): void {
  if (physicsPaused) instance.pauseAnimation?.();
  else instance.resumeAnimation?.();

  instance.d3ReheatSimulation?.();
}
