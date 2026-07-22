import type { GraphLayoutTickResult } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphFrameRuntime } from '../runtime/render';
import { syncOwnedLayoutNodesAtVersion, type OwnedGraphLayout } from '../../layout/runtime/model';
import { advanceGraphLayoutFixedTimestep } from '../../simulation/timing/clock';
import { createOwnedGraphExternalForce } from './pluginForces';

export function advanceOwnedGraphPhysics(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, timestamp: number): { simulationMs: number; tick: GraphLayoutTickResult } {
  const startedAt = performance.now();
  const externalForce = createOwnedGraphExternalForce(runtime, layout);
  const tick = advanceGraphLayoutFixedTimestep(runtime.simulationClockRef.current, {
    currentSettled: layout.engine.settled,
    minimumSteps: runtime.positionVersionRef.current === runtime.synchronizedPositionVersionRef.current ? 0 : 1,
    step: () => layout.engine.tick(externalForce),
    timestampMs: timestamp,
  });
  if (tick.steps > 0) runtime.positionVersionRef.current += 1;
  return { simulationMs: Math.max(0, performance.now() - startedAt), tick };
}

export function synchronizeOwnedFrameState(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout): void {
  runtime.synchronizedPositionVersionRef.current = syncOwnedLayoutNodesAtVersion(layout,
    runtime.positionVersionRef.current, runtime.synchronizedPositionVersionRef.current);
}
