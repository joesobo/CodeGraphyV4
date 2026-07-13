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
  createRenderedFrameFpsSampler,
  type RenderedFrameFpsSample,
  type RenderedFrameFpsSampler,
} from './fps';
import {
  applyOwnedGraphRuntimePhysicsSettings,
  disposeOwnedGraphLayoutRuntime,
  reconcileOwnedGraphRuntime,
  type OwnedGraphLayoutRuntime,
} from './layoutRuntime';
import { OwnedGraphLinkPicker } from './linkPicking';
import { OwnedGraphNodePicker } from './picking';
import { createOwnedGraphPluginForces } from './pluginForces';
import {
  startOwnedGraphRendererLifecycle,
  type OwnedGraphRendererLifecycleRuntime,
  type OwnedGraphRendererStatus,
} from './rendererLifecycle';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

function resetOwnedGraphFps(
  sampler: RenderedFrameFpsSampler | null,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  sampler?.reset();
  fpsRef.current = null;
  if (output) {
    output.hidden = true;
    output.textContent = '';
  }
}

function formatOwnedGraphFps(sample: RenderedFrameFpsSample): string {
  return `${Math.round(sample.fps)} FPS · ${sample.frameTimeMs.toFixed(1)} ms`
    + ` · 1% ${Math.round(sample.onePercentLowFps)}`;
}

function publishOwnedGraphFps(
  sample: RenderedFrameFpsSample,
  output: HTMLOutputElement | null,
): void {
  if (!output) return;
  output.textContent = formatOwnedGraphFps(sample);
  output.hidden = false;
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
  const fpsSamplerRef = useRef<RenderedFrameFpsSampler | null>(null);
  if (!fpsSamplerRef.current) fpsSamplerRef.current = createRenderedFrameFpsSampler();
  const requestFrameRef = useRef<() => void>(() => undefined);
  const ctrlClickSessionRef = useRef<CtrlClickSession | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const hoveredLinkRef = useRef<FGLink | null>(null);
  const engineStopNotifiedRef = useRef(false);
  const hasFittedCameraRef = useRef(false);
  const positionVersionRef = useRef(0);
  const synchronizedPositionVersionRef = useRef(-1);
  const styleVersionRef = useRef(0);
  const styledPropsRef = useRef<Surface2dProps | null>(null);
  const linkPickerPositionVersionRef = useRef(-1);
  const linkPickerRef = useRef(new OwnedGraphLinkPicker());
  const pickerPositionVersionRef = useRef(-1);
  const pickerRef = useRef(new OwnedGraphNodePicker());
  const pluginForcesRef = useRef(createOwnedGraphPluginForces());
  const pluginKinematicsVersionRef = useRef(-1);
  const [layoutKind, setLayoutKind] = useState<OwnedGraphLayout['kind']>('main-thread');
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
    setLayoutKind,
  }).current;
  propsRef.current = props;
  if (styledPropsRef.current !== props) {
    styledPropsRef.current = props;
    styleVersionRef.current += 1;
  }

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
      onError: message => {
        resetOwnedGraphFps(fpsSamplerRef.current, fpsRef, fpsOutputRef.current);
        setRendererError(message);
        setRendererStatus('error');
      },
      onReady: () => {
        setRendererError(null);
        setRendererStatus('webgpu');
      },
      onRecovering: () => {
        resetOwnedGraphFps(fpsSamplerRef.current, fpsRef, fpsOutputRef.current);
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
      fpsSamplerRef,
      frameRequestedRef,
      gpuRendererRef,
      hoveredLinkRef,
      layoutRef,
      pluginForcesRef,
      pluginKinematicsVersionRef,
      positionVersionRef,
      propsRef,
      rendererOperationalRef,
      requestFrameRef,
      recordRenderedFrame: () => undefined,
      styleVersionRef,
      synchronizedPositionVersionRef,
      publishFps: sample => publishOwnedGraphFps(sample, fpsOutputRef.current),
      onRendererError: message => {
        resetOwnedGraphFps(fpsSamplerRef.current, fpsRef, fpsOutputRef.current);
        setRendererError(message);
        setRendererStatus('error');
      },
    };
    const frameLoop = startOwnedGraphFrameLoop(frameLoopRuntime, canvas, props.fg2dRef);
    return () => frameLoop.dispose();
  }, [clearLinkHover, props.fg2dRef]);

  useEffect(() => {
    clearLinkHover();
    reconcileOwnedGraphRuntime(layoutRuntime);
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
    resetOwnedGraphFps(fpsSamplerRef.current, fpsRef, fpsOutputRef.current);
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
    positionVersionRef,
    propsRef,
    requestFrameRef,
    setLinkTooltip,
    synchronizedPositionVersionRef,
  });

  const fpsSample = props.showFps ? fpsSamplerRef.current?.sample() ?? null : null;

  return (
    <div
      className="absolute inset-0"
      data-codegraphy-layout={layoutKind}
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
          data-testid="graph-fps"
          hidden={fpsSample === null}
          style={{ zIndex: 20 }}
        >
          {fpsSample === null ? '' : formatOwnedGraphFps(fpsSample)}
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
