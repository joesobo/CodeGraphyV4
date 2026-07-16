import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { FGLink, FGNode } from '../../../../../model/build';
import { type OwnedGraphCamera } from '../../camera/runtime/model';
import type { Surface2dProps } from './contracts';
import { type OwnedGraphLayout } from '../../layout/runtime/model';
import {
  createOwnedGraphInteractionHandlers,
  type ContextGestureSession,
  type LinkTooltip,
  type PointerSession,
} from '../../interaction/model';
import { startOwnedGraphFrameLoop, type OwnedGraphFrameLoopRuntime } from '../../frame/runtime/loop';
import {
  createOwnedGraphPerformanceMonitor,
  type OwnedGraphPerformanceMonitor,
} from '../../frame/performance/model';
import {
  publishOwnedGraphPerformance,
  resetOwnedGraphPerformance,
} from '../../frame/performance/presentation';
import {
  applyOwnedGraphRuntimePhysicsSettings,
  disposeOwnedGraphLayoutRuntime,
  reconcileOwnedGraphRuntime,
  type OwnedGraphLayoutRuntime,
} from '../../layout/runtime/host';
import { useLazyRef } from './lazyRef';
import { OwnedGraphLinkPicker } from '../../picking/link/model';
import { OwnedGraphNodePicker } from '../../picking/node/model';
import { createOwnedGraphNodeHover, setOwnedGraphNodeHover } from '../../interaction/hover/model';
import { createOwnedGraphPluginForces } from '../../plugin/forces/model';
import { createGraphLayoutFixedTimestepClock } from '../../simulation/timing/clock';
import { type OwnedGraphRendererStatus } from '../../renderer/runtime/lifecycle';
import { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import { OwnedGraphStatusOverlays } from './overlays';
import { useOwnedRendererLifecycle } from '../../renderer/runtime/useLifecycle';
import { useOwnedPerformancePresentation } from './performancePresentation';
import { OwnedGraphMinimap } from '../../minimap/presentation';
import type { MinimapProjection } from '../../minimap/projection';
import { createMinimapScheduler, invalidateMinimapScheduler } from '../../minimap/scheduling';
import type { MinimapBounds } from '../../minimap/projection';
import {
  createMinimapInteractionHandlers,
  type MinimapNavigationSession,
} from '../../minimap/interaction';

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };
const NOOP = (): void => undefined;

export function OwnedGraphSurface2d(props: Surface2dProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRendererRef = useRef<WebGpuGraphRenderer | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapOverlayRef = useRef<SVGSVGElement>(null);
  const minimapPanelRef = useRef<HTMLDivElement>(null);
  const minimapProjectionRef = useRef<MinimapProjection | null>(null);
  const minimapBoundsRef = useRef<MinimapBounds | null>(null);
  const minimapSchedulerRef = useLazyRef(createMinimapScheduler);
  const minimapSurfaceRegisteredRef = useRef(false);
  const minimapViewportBoxRef = useRef<SVGRectElement>(null);
  const minimapDirectionIndicatorRef = useRef<SVGPathElement>(null);
  const minimapNavigationSessionRef = useRef<MinimapNavigationSession | null>(null);
  const rendererOperationalRef = useRef(false);
  const propsRef = useRef(props);
  const layoutRef = useRef<OwnedGraphLayout | null>(null);
  const cameraRef = useLazyRef<OwnedGraphCamera>(() => ({ ...INITIAL_CAMERA }));
  const animationFrameRef = useRef<number | null>(null);
  const frameRequestedRef = useRef(false);
  const fpsOutputRef = useRef<HTMLOutputElement>(null);
  const fpsRef = useRef<number | null>(null);
  const performanceMonitorRef = useLazyRef<OwnedGraphPerformanceMonitor>(
    createOwnedGraphPerformanceMonitor,
  );
  const requestFrameRef = useRef<() => void>(NOOP);
  const contextGestureSessionRef = useRef<ContextGestureSession | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const hoveredLinkRef = useRef<FGLink | null>(null);
  const nodeHoverRef = useLazyRef(createOwnedGraphNodeHover);
  const engineStopNotifiedRef = useRef(false);
  const simulationClockRef = useLazyRef(createGraphLayoutFixedTimestepClock);
  const hasFittedCameraRef = useRef(false);
  const positionVersionRef = useRef(0);
  const synchronizedPositionVersionRef = useRef(-1);
  const linkPickerPositionVersionRef = useRef(-1);
  const linkPickerRef = useLazyRef(() => new OwnedGraphLinkPicker());
  const pickerPositionVersionRef = useRef(-1);
  const pickerRef = useLazyRef(() => new OwnedGraphNodePicker());
  const pluginForcesRef = useLazyRef(createOwnedGraphPluginForces);
  const [rendererStatus, setRendererStatus] = useState<OwnedGraphRendererStatus>('initializing');
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<LinkTooltip | null>(null);
  const clearLinkHover = useCallback((): boolean => {
    if (!hoveredLinkRef.current) return false;
    hoveredLinkRef.current = null;
    setLinkTooltip(null);
    return true;
  }, []);
  const clearMinimapHover = useCallback((): void => {
    clearLinkHover();
    if (!hoveredNodeRef.current) return;
    hoveredNodeRef.current = null;
    setOwnedGraphNodeHover(nodeHoverRef.current, null, performance.now());
    propsRef.current.sharedProps.onNodeHover(null);
  }, [clearLinkHover, nodeHoverRef]);
  const layoutRuntime = useLazyRef<OwnedGraphLayoutRuntime>(() => ({
    cameraRef,
    canvasRef,
    engineStopNotifiedRef,
    hasFittedCameraRef,
    layoutRef,
    pluginForcesRef,
    pointerSessionRef,
    positionVersionRef,
    propsRef,
    rendererOperationalRef,
    requestFrameRef,
    synchronizedPositionVersionRef,
  })).current;
  propsRef.current = props;

  useOwnedRendererLifecycle({
    engineStopNotifiedRef, fpsOutputRef, fpsRef, frameRequestedRef, gpuCanvasRef,
    gpuRendererRef, layoutRef, performanceMonitorRef, rendererOperationalRef,
    requestFrameRef, setRendererError, setRendererStatus, simulationClockRef,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frameLoopRuntime: OwnedGraphFrameLoopRuntime = {
      animationFrameRef,
      cameraRef,
      clearLinkHover,
      engineStopNotifiedRef,
      fpsRef,
      frameRequestedRef,
      gpuRendererRef,
      hoveredLinkRef,
      hoveredNodeRef,
      layoutRef,
      minimapProjectionRef,
      minimapBoundsRef,
      minimapSchedulerRef,
      minimapSurfaceRegisteredRef,
      minimapPanelRef,
      minimapViewportBoxRef,
      minimapDirectionIndicatorRef,
      nodeHoverRef,
      performanceMonitorRef,
      pointerSessionRef,
      pluginForcesRef,
      positionVersionRef,
      propsRef,
      rendererOperationalRef,
      requestFrameRef,
      simulationClockRef,
      synchronizedPositionVersionRef,
      publishPerformance: sample => publishOwnedGraphPerformance(
        sample,
        fpsOutputRef.current,
      ),
      onRendererError: message => {
        resetOwnedGraphPerformance(
          performanceMonitorRef.current,
          fpsRef,
          fpsOutputRef.current,
        );
        setRendererError(message);
        setRendererStatus('error');
      },
    };
    const frameLoop = startOwnedGraphFrameLoop(frameLoopRuntime, canvas, props.fg2dRef);
    return () => frameLoop.dispose();
  }, [
    cameraRef,
    clearLinkHover,
    nodeHoverRef,
    performanceMonitorRef,
    minimapSchedulerRef,
    pluginForcesRef,
    props.fg2dRef,
    simulationClockRef,
  ]);

  useEffect(() => {
    clearLinkHover();
    reconcileOwnedGraphRuntime(layoutRuntime);
  }, [
    clearLinkHover,
    props.sharedProps.graphData,
    props.graphViewContributions,
    layoutRuntime,
  ]);

  useEffect(() => () => {
    disposeOwnedGraphLayoutRuntime(layoutRuntime);
  }, [layoutRuntime]);

  useEffect(() => {
    applyOwnedGraphRuntimePhysicsSettings(layoutRuntime);
  }, [
    props.physicsSettings.centerForce,
    props.physicsSettings.damping,
    props.physicsSettings.linkDistance,
    props.physicsSettings.linkForce,
    props.physicsSettings.repelForce,
    layoutRuntime,
  ]);

  useOwnedPerformancePresentation(props.showFps, performanceMonitorRef, fpsOutputRef);

  useEffect(() => {
    if (!props.showMinimap) {
      minimapBoundsRef.current = null;
      minimapProjectionRef.current = null;
      minimapNavigationSessionRef.current = null;
      return;
    }
    const renderer = gpuRendererRef.current;
    const minimapCanvas = minimapCanvasRef.current;
    if (rendererStatus !== 'webgpu' || !renderer || !minimapCanvas) return;
    renderer.setSecondarySurface(minimapCanvas);
    minimapSurfaceRegisteredRef.current = true;
    invalidateMinimapScheduler(minimapSchedulerRef.current);
    requestFrameRef.current();
    return () => {
      minimapSurfaceRegisteredRef.current = false;
      renderer.setSecondarySurface(undefined);
    };
  }, [minimapSchedulerRef, props.showMinimap, rendererStatus]);

  useEffect(() => {
    requestFrameRef.current();
  });

  const interactionHandlers = useLazyRef(() => createOwnedGraphInteractionHandlers({
    cameraRef,
    clearLinkHover,
    contextGestureSessionRef,
    engineStopNotifiedRef,
    hoveredLinkRef,
    hoveredNodeRef,
    layoutRef,
    linkPickerPositionVersionRef,
    linkPickerRef,
    nodeHoverRef,
    pickerPositionVersionRef,
    pickerRef,
    pointerSessionRef,
    positionVersionRef,
    propsRef,
    requestFrameRef,
    setLinkTooltip,
    synchronizedPositionVersionRef,
  })).current;
  const minimapInteractionHandlers = useLazyRef(() => createMinimapInteractionHandlers({
    cameraRef,
    clearHover: clearMinimapHover,
    mainCanvasRef: canvasRef,
    projectionRef: minimapProjectionRef,
    requestFrame: () => requestFrameRef.current(),
    sessionRef: minimapNavigationSessionRef,
  })).current;

  const performanceSample = props.showFps
    ? performanceMonitorRef.current.sample()
    : null;

  return (
    <div
      className="absolute inset-0"
      data-codegraphy-physics="wasm"
      data-codegraphy-renderer={rendererStatus}
      style={{ backgroundColor: props.backgroundColor }}
    >
      <canvas
        ref={gpuCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        onContextMenu={interactionHandlers.handleContextMenu}
        onPointerCancel={interactionHandlers.handlePointerCancel}
        onPointerDown={interactionHandlers.handlePointerDown}
        onPointerLeave={interactionHandlers.handlePointerLeave}
        onPointerMove={interactionHandlers.handlePointerMove}
        onPointerUp={interactionHandlers.handlePointerUp}
        onWheel={interactionHandlers.handleWheel}
        style={{ touchAction: 'none' }}
      />
      {props.showMinimap ? <OwnedGraphMinimap
        canvasRef={minimapCanvasRef}
        overlayRef={minimapOverlayRef}
        panelRef={minimapPanelRef}
        viewportBoxRef={minimapViewportBoxRef}
        directionIndicatorRef={minimapDirectionIndicatorRef}
        interactionHandlers={minimapInteractionHandlers}
      /> : null}
      <OwnedGraphStatusOverlays error={rendererError} fpsOutputRef={fpsOutputRef}
        performanceSample={performanceSample} tooltip={linkTooltip} width={props.sharedProps.width ?? 0} />
    </div>
  );
}
