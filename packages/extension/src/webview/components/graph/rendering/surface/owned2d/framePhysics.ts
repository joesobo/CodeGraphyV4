import { graphNodeWorldScale, type GraphLayoutTickResult } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphFrameRuntime } from './frame';
import { syncOwnedLayoutNodesAtVersion, type OwnedGraphLayout } from './layout';
import { advanceGraphLayoutFixedTimestep } from './simulationClock';
import { applyOwnedPluginForces } from './framePluginForces';

export function advanceOwnedGraphPhysics(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, timestamp: number): { simulationMs: number; tick: GraphLayoutTickResult } {
  const startedAt = performance.now();
  applyOwnedPluginForces(runtime, layout);
  const wasSettled = layout.engine.settled;
  layout.engine.setCollisionScale(graphNodeWorldScale(runtime.cameraRef.current.zoom));
  if (wasSettled && !layout.engine.settled) runtime.engineStopNotifiedRef.current = false;
  const tick = advanceGraphLayoutFixedTimestep(runtime.simulationClockRef.current, {
    currentSettled: layout.engine.settled, minimumSteps: runtime.pointerSessionRef.current === null ? 0 : 1,
    step: () => layout.engine.tick(), timestampMs: timestamp,
  });
  if (tick.steps > 0) runtime.positionVersionRef.current += 1;
  return { simulationMs: Math.max(0, performance.now() - startedAt), tick };
}

export function synchronizeOwnedFrameState(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout): void {
  runtime.synchronizedPositionVersionRef.current = syncOwnedLayoutNodesAtVersion(layout,
    runtime.positionVersionRef.current, runtime.synchronizedPositionVersionRef.current);
}
