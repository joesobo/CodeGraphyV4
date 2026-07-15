import type { GraphLayoutTickResult } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphFrameRuntime } from './frame';
import { resetGraphLayoutFixedTimestepClock } from './simulationClock';

export function shouldContinueOwnedGraphFrames(runtime: OwnedGraphFrameRuntime, tick: GraphLayoutTickResult): boolean {
  return runtime.rendererOperationalRef.current && (
    runtime.pointerSessionRef.current !== null || runtime.cameraRef.current.transition != null
    || runtime.nodeHoverRef.current.transition !== null || tick.moving
    || runtime.propsRef.current.directionMode === 'particles' || runtime.propsRef.current.showFps
  );
}

export function updateOwnedGraphFrameLifecycle(runtime: OwnedGraphFrameRuntime, tick: GraphLayoutTickResult): void {
  if (tick.settled && !runtime.engineStopNotifiedRef.current) {
    runtime.engineStopNotifiedRef.current = true;
    runtime.propsRef.current.sharedProps.onEngineStop();
  }
  if (!shouldContinueOwnedGraphFrames(runtime, tick) && tick.settled
    && runtime.propsRef.current.directionMode !== 'particles') {
    resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
    runtime.markPerformanceIdle();
  }
}
