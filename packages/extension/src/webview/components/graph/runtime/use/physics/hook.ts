import { useRef, type MutableRefObject } from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import { usePhysicsRuntimeInit } from './hook/init';
import { usePhysicsRuntimeLayoutKey, usePhysicsRuntimeLayoutReset } from './hook/layout';
import { usePhysicsRuntimePause } from './hook/pause';
import { usePhysicsRuntimeUpdates } from './hook/updates';

interface GraphPhysicsAnimationControls {
	d3ReheatSimulation?(): void;
	pauseAnimation?(): void;
	resumeAnimation?(): void;
}

interface UsePhysicsRuntimeProps {
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  graphMode: '2d' | '3d';
  layoutKey: string;
  physicsPaused?: boolean;
  physicsSettings: IPhysicsSettings;
}

export function usePhysicsRuntime({
  fg2dRef,
  fg3dRef,
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

  physicsSettingsRef.current = physicsSettings;

  usePhysicsRuntimeUpdates({
    fg2dRef,
    fg3dRef,
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
    graphMode,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    pendingThreeDimensionalInitRef,
    previousPhysicsRef,
  });

  usePhysicsRuntimeLayoutKey({
    fg2dRef,
    fg3dRef,
    graphMode,
    layoutKey,
    physicsPaused,
    physicsInitialisedRef,
    physicsSettingsRef,
    previousLayoutKeyRef,
  });
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
