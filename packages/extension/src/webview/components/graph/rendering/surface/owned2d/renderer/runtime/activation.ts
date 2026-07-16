import { type WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import { resetGraphLayoutFixedTimestepClock } from '../../simulation/timing/clock';
import type { OwnedGraphRendererLifecycleRuntime } from './lifecycle';

export function pauseOwnedGraphRendererPhysics(runtime: OwnedGraphRendererLifecycleRuntime): void {
  runtime.rendererOperationalRef.current = false;
  runtime.layoutRef.current?.engine.pause();
  resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
}

export function reportOwnedGraphRendererError(runtime: OwnedGraphRendererLifecycleRuntime, message: string, requestFrame: boolean): void {
  pauseOwnedGraphRendererPhysics(runtime);
  runtime.onError(message);
  if (requestFrame) runtime.requestFrameRef.current();
}

export function disposeCurrentRenderer(runtime: OwnedGraphRendererLifecycleRuntime): void {
  runtime.gpuRendererRef.current?.dispose();
  runtime.gpuRendererRef.current = null;
}

export function activateOwnedGraphRenderer(runtime: OwnedGraphRendererLifecycleRuntime, renderer: WebGpuGraphRenderer): void {
  runtime.gpuRendererRef.current = renderer;
  runtime.rendererOperationalRef.current = true;
  resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
  const layout = runtime.layoutRef.current;
  if (layout) {
    layout.engine.resume();
    layout.engine.reheat();
    runtime.engineStopNotifiedRef.current = false;
  }
  runtime.onReady();
  runtime.requestFrameRef.current();
}
