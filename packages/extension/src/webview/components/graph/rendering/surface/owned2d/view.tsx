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
  type CtrlClickSession,
  type LinkTooltip,
  type PointerSession,
} from './interaction';
import { startOwnedGraphFrameLoop, type OwnedGraphFrameLoopRuntime } from './frameLoop';
import {
  createOwnedGraphStageAttributionProfiler,
  type OwnedGraphStageAttributionProfiler,
} from './performance/attribution';
import { createOwnedGraphInteractionRecorder } from './performance/recording';
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
import { OwnedGraphLinkPicker } from './linkPicking';
import { OwnedGraphNodePicker } from './picking';
import { createOwnedGraphPluginForces } from './pluginForces';
import { createGraphLayoutFixedTimestepClock } from './physics/fixedTimestep';
import {
  startOwnedGraphRendererLifecycle,
  type OwnedGraphRendererLifecycleRuntime,
  type OwnedGraphRendererStatus,
} from './rendererLifecycle';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

function clearActivePerformanceData(output: HTMLOutputElement): void {
  delete output.dataset.displayedFps;
  delete output.dataset.frameAverageMs;
  delete output.dataset.frameMaximumMs;
  delete output.dataset.frameOnePercentHighMs;
  delete output.dataset.potentialFps;
  delete output.dataset.renderAverageMs;
  delete output.dataset.renderMaximumMs;
  delete output.dataset.renderOnePercentHighMs;
  delete output.dataset.sampleCount;
  delete output.dataset.simulationAverageMs;
  delete output.dataset.simulationMaximumMs;
  delete output.dataset.simulationOnePercentHighMs;
}

function formatOwnedGraphPerformance(sample: OwnedGraphPerformanceSample): string {
  if (sample.status === 'idle') return 'Idle';
  const displayed = sample.displayedFps === null
    ? 'Warming'
    : `${Math.round(sample.displayedFps)} FPS`;
  return `Potential ${Math.round(sample.potentialFps)} FPS · Displayed ${displayed}`
    + ` · Frame ${sample.frameTimeMs.average.toFixed(2)} ms avg`
    + ` · ${sample.frameTimeMs.maximum.toFixed(2)} ms max`
    + ` · 1% high ${sample.frameTimeMs.onePercentHigh.toFixed(2)} ms`
    + ` · Sim ${sample.simulationTimeMs.average.toFixed(2)} ms avg`
    + ` · ${sample.simulationTimeMs.maximum.toFixed(2)} ms max`
    + ` · 1% high ${sample.simulationTimeMs.onePercentHigh.toFixed(2)} ms`
    + ` · Render ${sample.renderTimeMs.average.toFixed(2)} ms avg`
    + ` · ${sample.renderTimeMs.maximum.toFixed(2)} ms max`
    + ` · 1% high ${sample.renderTimeMs.onePercentHigh.toFixed(2)} ms`;
}

function setActivePerformanceData(
  output: HTMLOutputElement,
  sample: OwnedGraphActivePerformanceSample,
): void {
  if (sample.displayedFps === null) delete output.dataset.displayedFps;
  else output.dataset.displayedFps = String(sample.displayedFps);
  output.dataset.frameAverageMs = String(sample.frameTimeMs.average);
  output.dataset.frameMaximumMs = String(sample.frameTimeMs.maximum);
  output.dataset.frameOnePercentHighMs = String(sample.frameTimeMs.onePercentHigh);
  output.dataset.potentialFps = String(sample.potentialFps);
  output.dataset.renderAverageMs = String(sample.renderTimeMs.average);
  output.dataset.renderMaximumMs = String(sample.renderTimeMs.maximum);
  output.dataset.renderOnePercentHighMs = String(sample.renderTimeMs.onePercentHigh);
  output.dataset.sampleCount = String(sample.sampleCount);
  output.dataset.simulationAverageMs = String(sample.simulationTimeMs.average);
  output.dataset.simulationMaximumMs = String(sample.simulationTimeMs.maximum);
  output.dataset.simulationOnePercentHighMs = String(
    sample.simulationTimeMs.onePercentHigh,
  );
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
  monitor: OwnedGraphPerformanceMonitor | null,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  monitor?.reset();
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
  const cameraRef = useRef<OwnedGraphCamera>({ ...INITIAL_CAMERA });
  const animationFrameRef = useRef<number | null>(null);
  const frameRequestedRef = useRef(false);
  const fpsOutputRef = useRef<HTMLOutputElement>(null);
  const fpsRef = useRef<number | null>(null);
  const performanceAttributionRef = useRef<OwnedGraphStageAttributionProfiler>(null!);
  if (!performanceAttributionRef.current) {
    performanceAttributionRef.current = createOwnedGraphStageAttributionProfiler();
  }
  const reactReconciliationStartedAt = performanceAttributionRef.current.startTiming();
  const performanceMonitorRef = useRef<OwnedGraphPerformanceMonitor | null>(null);
  if (!performanceMonitorRef.current) {
    performanceMonitorRef.current = createOwnedGraphPerformanceMonitor();
  }
  const performanceRecorderRef = useRef<ReturnType<
    typeof createOwnedGraphInteractionRecorder
  >>(null!);
  if (!performanceRecorderRef.current) {
    performanceRecorderRef.current = createOwnedGraphInteractionRecorder();
  }
  const requestFrameRef = useRef<() => void>(() => undefined);
  const ctrlClickSessionRef = useRef<CtrlClickSession | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const hoveredLinkRef = useRef<FGLink | null>(null);
  const engineStopNotifiedRef = useRef(false);
  const simulationClockRef = useRef(createGraphLayoutFixedTimestepClock());
  const hasFittedCameraRef = useRef(false);
  const positionVersionRef = useRef(0);
  const synchronizedPositionVersionRef = useRef(-1);
  const linkPickerPositionVersionRef = useRef(-1);
  const linkPickerRef = useRef(new OwnedGraphLinkPicker());
  const pickerPositionVersionRef = useRef(-1);
  const pickerRef = useRef(new OwnedGraphNodePicker());
  const pluginForcesRef = useRef(createOwnedGraphPluginForces());
  const [rendererStatus, setRendererStatus] = useState<OwnedGraphRendererStatus>('initializing');
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<LinkTooltip | null>(null);
  const clearLinkHover = useCallback((): boolean => {
    if (!hoveredLinkRef.current) return false;
    hoveredLinkRef.current = null;
    setLinkTooltip(null);
    return true;
  }, []);
  const layoutRuntime = useRef<OwnedGraphLayoutRuntime>({
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
  }).current;
  propsRef.current = props;

  useEffect(() => {
    const gpuCanvas = gpuCanvasRef.current;
    if (!gpuCanvas) return;
    const rendererRuntime: OwnedGraphRendererLifecycleRuntime = {
      engineStopNotifiedRef,
      frameRequestedRef,
      gpuRendererRef,
      layoutRef,
      performanceAttributionRef,
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
  }, []);

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
      layoutRef,
      performanceAttributionRef,
      performanceMonitorRef,
      performanceRecorderRef,
      pointerSessionRef,
      pluginForcesRef,
      positionVersionRef,
      propsRef,
      rendererOperationalRef,
      requestFrameRef,
      simulationClockRef,
      markPerformanceIdle: () => undefined,
      recordRenderedFrame: () => undefined,
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
  }, [clearLinkHover, props.fg2dRef]);

  useEffect(() => {
    const startedAt = performanceAttributionRef.current.startTiming();
    clearLinkHover();
    reconcileOwnedGraphRuntime(layoutRuntime);
    performanceAttributionRef.current.finishTiming(
      'propsRuntimeReconciliation',
      startedAt,
    );
  }, [
    clearLinkHover,
    props.sharedProps.dagLevelDistance,
    props.sharedProps.dagMode,
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
    props.physicsSettings?.centerForce,
    props.physicsSettings?.damping,
    props.physicsSettings?.linkDistance,
    props.physicsSettings?.linkForce,
    props.physicsSettings?.repelForce,
    layoutRuntime,
  ]);

  useEffect(() => {
    if (props.showFps) {
      publishOwnedGraphPerformance(
        performanceMonitorRef.current?.sample() ?? { status: 'idle' },
        fpsOutputRef.current,
      );
    }
    requestFrameRef.current();
  }, [props.showFps]);

  useEffect(() => {
    requestFrameRef.current();
  });

  const interactionHandlers = createOwnedGraphInteractionHandlers({
    cameraRef,
    clearLinkHover,
    ctrlClickSessionRef,
    engineStopNotifiedRef,
    hoveredLinkRef,
    hoveredNodeRef,
    layoutRef,
    linkPickerPositionVersionRef,
    linkPickerRef,
    pickerPositionVersionRef,
    pickerRef,
    pointerSessionRef,
    performanceAttributionRef,
    performanceRecorderRef,
    positionVersionRef,
    propsRef,
    requestFrameRef,
    setLinkTooltip,
    synchronizedPositionVersionRef,
  });

  const performanceSample = performanceMonitorRef.current?.sample()
    ?? { status: 'idle' as const };

  const view = (
    <div
      className="absolute inset-0"
      data-codegraphy-layout="main-thread"
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
      {props.showFps ? (
        <output
          ref={fpsOutputRef}
          className="pointer-events-none absolute bottom-2 left-2 rounded bg-popover/80 px-1.5 py-0.5 font-mono text-xs text-popover-foreground"
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
  performanceAttributionRef.current.finishTiming(
    'reactReconciliation',
    reactReconciliationStartedAt,
  );
  return view;
}
