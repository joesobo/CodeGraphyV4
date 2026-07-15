import type { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import type { MutableRefObject } from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import { advanceOwnedGraphCameraTransition, type OwnedGraphCamera } from './camera';
import type { Surface2dProps } from './contracts';
import { drawOwnedDecorationLayer, prepareOwnedOverlayCanvas } from './frameOverlay';
import { advanceOwnedGraphPhysics, synchronizeOwnedFrameState } from './framePhysics';
import { shouldContinueOwnedGraphFrames, updateOwnedGraphFrameLifecycle } from './frameScheduling';
import { submitOwnedWebGpuFrame } from './frameSubmission';
import type { PointerSession } from './interaction';
import type { OwnedGraphLayout } from './layout';
import { advanceOwnedGraphNodeHover, type OwnedGraphNodeHover } from './nodeHover';
import type { OwnedGraphPluginForces } from './pluginForces';
import type { GraphLayoutFixedTimestepClock } from './simulationClock';

export interface OwnedGraphFrameRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>; engineStopNotifiedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<WebGpuGraphRenderer | null>; hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>; layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  nodeHoverRef: MutableRefObject<OwnedGraphNodeHover>; pointerSessionRef: MutableRefObject<PointerSession | null>;
  pluginForcesRef: MutableRefObject<OwnedGraphPluginForces>; positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>; rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>; simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
  markPerformanceIdle(this: void): void;
  recordRenderedFrame(this: void, timestamp: number, simulationMs: number, renderMs: number): void;
  synchronizedPositionVersionRef: MutableRefObject<number>; onRendererError(this: void, message: string): void;
}

export function renderOwnedGraphFrame(runtime: OwnedGraphFrameRuntime, canvas: HTMLCanvasElement, timestamp: number): void {
  const layout = runtime.layoutRef.current;
  const context = canvas.getContext('2d');
  if (!layout || !context) return;
  advanceOwnedGraphCameraTransition(runtime.cameraRef.current, timestamp);
  advanceOwnedGraphNodeHover(runtime.nodeHoverRef.current, timestamp);
  const physics = advanceOwnedGraphPhysics(runtime, layout, timestamp);
  const physicsEndedAt = performance.now();
  synchronizeOwnedFrameState(runtime, layout);
  const prepared = prepareOwnedOverlayCanvas(canvas, context);
  const rendered = submitOwnedWebGpuFrame(runtime, layout, prepared);
  drawOwnedDecorationLayer(runtime, layout, prepared, timestamp, rendered);
  if (rendered) runtime.recordRenderedFrame(timestamp, physics.simulationMs, Math.max(0, performance.now() - physicsEndedAt));
  updateOwnedGraphFrameLifecycle(runtime, physics.tick);
  if (shouldContinueOwnedGraphFrames(runtime, physics.tick)) runtime.requestFrameRef.current();
}
