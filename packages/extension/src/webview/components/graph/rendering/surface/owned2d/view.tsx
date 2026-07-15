import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import { type OwnedGraphCamera } from './camera';
import type { Surface2dProps } from './contracts';
import { type OwnedGraphLayout } from './layout';
import {
  createOwnedGraphInteractionHandlers,
  type ContextGestureSession,
  type LinkTooltip,
  type PointerSession,
} from './interaction';
import { startOwnedGraphFrameLoop, type OwnedGraphFrameLoopRuntime } from './frameLoop';
import {
  createOwnedGraphPerformanceMonitor,
  type OwnedGraphActivePerformanceSample,
  type OwnedGraphPerformanceMonitor,
  type OwnedGraphPerformanceSample,
} from './performance/model';
import {
  applyOwnedGraphRuntimePhysicsSettings,
  disposeOwnedGraphLayoutRuntime,
  reconcileOwnedGraphRuntime,
  type OwnedGraphLayoutRuntime,
} from './layoutRuntime';
import { useLazyRef } from './lazyRef';
import { OwnedGraphLinkPicker } from './linkPicking';
import { OwnedGraphNodePicker } from './picking';
import { createOwnedGraphNodeHover } from './nodeHover';
import { createOwnedGraphPluginForces } from './pluginForces';
import { createGraphLayoutFixedTimestepClock } from './simulationClock';
import {
  startOwnedGraphRendererLifecycle,
  type OwnedGraphRendererLifecycleRuntime,
  type OwnedGraphRendererStatus,
} from './rendererLifecycle';
import { OwnedWebGpuRenderer } from '@codegraphy-dev/graph-renderer/webgpu';

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };
const NOOP = (): void => undefined;

function clearActivePerformanceData(output: HTMLOutputElement): void {
  delete output.dataset.frameAverageMs;
  delete output.dataset.potentialFps;
  delete output.dataset.sampleCount;
}

function formatOwnedGraphPerformance(sample: OwnedGraphPerformanceSample): string {
  if (sample.status === 'idle') return '— FPS · — ms';
  return `${Math.round(sample.potentialFps)} FPS · ${sample.frameTimeMs.toFixed(2)} ms`;
}

function setActivePerformanceData(
  output: HTMLOutputElement,
  sample: OwnedGraphActivePerformanceSample,
): void {
  output.dataset.frameAverageMs = String(sample.frameTimeMs);
  output.dataset.potentialFps = String(sample.potentialFps);
  output.dataset.sampleCount = String(sample.sampleCount);
}

function publishOwnedGraphPerformance(
  sample: OwnedGraphPerformanceSample,
  output: HTMLOutputElement | null,
): void {
  if (!output) return;
  output.dataset.performanceStatus = sample.status;
  if (sample.status === 'active') setActivePerformanceData(output, sample);
  else clearActivePerformanceData(output);
  output.textContent = formatOwnedGraphPerformance(sample);
  output.hidden = false;
}

function resetOwnedGraphPerformance(
  monitor: OwnedGraphPerformanceMonitor,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  monitor.reset();
  fpsRef.current = null;
  publishOwnedGraphPerformance({ status: 'idle' }, output);
}

export function OwnedGraphSurface2d(props: Surface2dProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRendererRef = useRef<OwnedWebGpuRenderer | null>(null);
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

  useEffect(() => {
    const gpuCanvas = gpuCanvasRef.current;
    if (!gpuCanvas) return;
    const rendererRuntime: OwnedGraphRendererLifecycleRuntime = {
      engineStopNotifiedRef,
      frameRequestedRef,
      gpuRendererRef,
      layoutRef,
      rendererOperationalRef,
      requestFrameRef,
      simulationClockRef,
      onError: message => {
        resetOwnedGraphPerformance(
          performanceMonitorRef.current,
          fpsRef,
          fpsOutputRef.current,
        );
        setRendererError(message);
        setRendererStatus('error');
      },
      onReady: () => {
        setRendererError(null);
        setRendererStatus('webgpu');
      },
      onRecovering: () => {
        resetOwnedGraphPerformance(
          performanceMonitorRef.current,
          fpsRef,
          fpsOutputRef.current,
        );
        setRendererError(null);
        setRendererStatus('initializing');
      },
    };
    const lifecycle = startOwnedGraphRendererLifecycle(rendererRuntime, gpuCanvas);
    return () => lifecycle.dispose();
  }, [performanceMonitorRef, simulationClockRef]);

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

  useEffect(() => {
    if (props.showFps) {
      publishOwnedGraphPerformance(
        performanceMonitorRef.current.sample(),
        fpsOutputRef.current,
      );
    }
  }, [performanceMonitorRef, props.showFps]);

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
      {performanceSample ? (
        <output
          ref={fpsOutputRef}
          className="pointer-events-none absolute right-2 top-10 whitespace-nowrap rounded bg-popover/80 px-1.5 py-0.5 font-mono text-xs text-popover-foreground"
          data-codegraphy-overlay="fps"
          data-performance-status={performanceSample.status}
          data-testid="graph-fps"
          style={{ zIndex: 20 }}
        >
          {formatOwnedGraphPerformance(performanceSample)}
        </output>
      ) : null}
      {rendererError ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
          data-testid="graph-webgpu-error"
          role="alert"
        >
          {rendererError}
        </div>
      ) : null}
      {linkTooltip ? (
        <div
          className="pointer-events-none absolute max-w-72 rounded-md border border-border bg-popover px-3 py-2 text-[11px] text-popover-foreground shadow-md"
          data-testid="graph-edge-tooltip"
          style={{
            left: Math.min(linkTooltip.screen.x + 12, Math.max(8, (props.sharedProps.width ?? 0) - 292)),
            top: linkTooltip.screen.y + 12,
            zIndex: 1000,
          }}
        >
          <p className="font-semibold text-link break-all">
            {typeof linkTooltip.link.source === 'string'
              ? linkTooltip.link.source
              : linkTooltip.link.source.label}
            {' → '}
            {typeof linkTooltip.link.target === 'string'
              ? linkTooltip.link.target
              : linkTooltip.link.target.label}
          </p>
          <p className="font-mono text-muted-foreground">
            {linkTooltip.link.kind ?? linkTooltip.link.runtimeEdgeType ?? 'Connection'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
