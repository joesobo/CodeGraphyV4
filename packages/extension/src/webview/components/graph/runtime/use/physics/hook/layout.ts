import { useEffect, type MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { PhysicsRuntimeRefs } from './refs';
import { applyPhysicsSettings, syncPhysicsAnimation } from '../../../physics';

interface UsePhysicsRuntimeLayoutKeyOptions extends PhysicsRuntimeRefs {
  layoutKey: string;
  physicsPaused: boolean;
  physicsInitialisedRef: MutableRefObject<boolean>;
  physicsSettingsRef: MutableRefObject<IPhysicsSettings>;
  previousLayoutKeyRef: MutableRefObject<string | null>;
}

export function usePhysicsRuntimeLayoutKey({
  fg2dRef,
  layoutKey,
  physicsPaused,
  physicsInitialisedRef,
  physicsSettingsRef,
  previousLayoutKeyRef,
}: UsePhysicsRuntimeLayoutKeyOptions): void {
  useEffect(() => {
    const graph = fg2dRef.current;
    if (!graph || !physicsInitialisedRef.current) return;

    if (previousLayoutKeyRef.current === null) {
      previousLayoutKeyRef.current = layoutKey;
      return;
    }
    if (previousLayoutKeyRef.current === layoutKey) return;

    previousLayoutKeyRef.current = layoutKey;
    applyPhysicsSettings(graph, physicsSettingsRef.current);
    if (physicsPaused) syncPhysicsAnimation(graph, true);
  }, [
    fg2dRef,
    layoutKey,
    physicsInitialisedRef,
    physicsPaused,
    physicsSettingsRef,
    previousLayoutKeyRef,
  ]);
}
