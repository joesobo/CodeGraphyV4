import type { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import type { MutableRefObject } from 'react';
import type { FGLink, FGNode } from '../../../../../model/build';
import { advanceOwnedGraphCameraTransition, type OwnedGraphCamera } from '../../camera/runtime/model';
import type { Surface2dProps } from '../../view/surface/contracts';
import { drawOwnedDecorationLayer, prepareOwnedOverlayCanvas } from '../drawing/layer';
import { advanceOwnedGraphPhysics, synchronizeOwnedFrameState } from '../physics/advance';
import { shouldContinueOwnedGraphFrames, updateOwnedGraphFrameLifecycle } from './scheduling';
import { submitOwnedWebGpuFrame } from './submission';
import type { PointerSession } from '../../interaction/model';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import { advanceOwnedGraphNodeHover, type OwnedGraphNodeHover } from '../../interaction/hover/model';
import type { OwnedGraphPluginForces } from '../../plugin/forces/model';
import type { GraphLayoutFixedTimestepClock } from '../../simulation/timing/clock';
import type { MinimapSceneMeasurement } from '../../minimap/scene';
import type { MinimapProjection } from '../../minimap/projection';
import type { MinimapScheduler } from '../../minimap/state';

export interface OwnedGraphFrameRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>; engineStopNotifiedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<WebGpuGraphRenderer | null>; hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>; layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  nodeHoverRef: MutableRefObject<OwnedGraphNodeHover>; pointerSessionRef: MutableRefObject<PointerSession | null>;
  pluginForcesRef: MutableRefObject<OwnedGraphPluginForces>; positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>; rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>; simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
  minimapProjectionRef: MutableRefObject<MinimapProjection | null>;
  minimapBoundsRef: MutableRefObject<MinimapSceneMeasurement | null>;
  minimapSchedulerRef: MutableRefObject<MinimapScheduler>;
  minimapSurfaceRegisteredRef: MutableRefObject<boolean>;
  minimapPanelRef: MutableRefObject<HTMLDivElement | null>;
  minimapViewportBoxRef: MutableRefObject<SVGRectElement | null>;
  minimapDirectionIndicatorRef: MutableRefObject<SVGPathElement | null>;
  markPerformanceIdle(this: void): void;
  recordRenderedFrame(this: void, submissionId: number, timestamp: number, simulationMs: number, renderMs: number): void;
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
  const submissionId = submitOwnedWebGpuFrame(
    runtime,
    layout,
    prepared,
    physics.tick.moving,
    timestamp,
  );
  try {
    drawOwnedDecorationLayer(runtime, layout, prepared, timestamp, submissionId !== null);
  } catch (error) {
    console.error('[CodeGraphy] Graph decoration frame failed:', error);
  } finally {
    if (submissionId !== null) {
      runtime.recordRenderedFrame(
        submissionId,
        timestamp,
        physics.simulationMs,
        Math.max(0, performance.now() - physicsEndedAt),
      );
    }
    updateOwnedGraphFrameLifecycle(runtime, physics.tick);
    if (shouldContinueOwnedGraphFrames(runtime, physics.tick)) runtime.requestFrameRef.current();
  }
}
