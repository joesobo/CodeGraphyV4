import {
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
  applyOwnedGraphRuntimePhysicsSettings,
  disposeOwnedGraphLayoutRuntime,
  reconcileOwnedGraphRuntime,
  type OwnedGraphLayoutRuntime,
} from './layoutRuntime';
import { OwnedGraphNodePicker } from './picking';
import { createOwnedGraphPluginForces } from './pluginForces';
import {
  startOwnedGraphRendererLifecycle,
  type OwnedGraphRendererLifecycleRuntime,
  type OwnedGraphRendererStatus,
} from './rendererLifecycle';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

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
  const requestFrameRef = useRef<() => void>(() => undefined);
  const skipPhysicsFrameRef = useRef(false);
  const ctrlClickSessionRef = useRef<CtrlClickSession | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const hoveredLinkRef = useRef<FGLink | null>(null);
  const engineStopNotifiedRef = useRef(false);
  const hasFittedCameraRef = useRef(false);
  const positionVersionRef = useRef(0);
  const styleVersionRef = useRef(0);
  const pickerPositionVersionRef = useRef(-1);
  const pickerRef = useRef(new OwnedGraphNodePicker());
  const pluginForcesRef = useRef(createOwnedGraphPluginForces());
  const [layoutKind, setLayoutKind] = useState<OwnedGraphLayout['kind']>('main-thread');
  const [rendererStatus, setRendererStatus] = useState<OwnedGraphRendererStatus>('initializing');
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<LinkTooltip | null>(null);
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
  styleVersionRef.current += 1;

  useEffect(() => {
    const gpuCanvas = gpuCanvasRef.current;
    if (!gpuCanvas) return;
    const rendererRuntime: OwnedGraphRendererLifecycleRuntime = {
      engineStopNotifiedRef,
      frameRequestedRef,
      gpuRendererRef,
      layoutRef,
      propsRef,
      rendererOperationalRef,
      requestFrameRef,
      onError: message => {
        setRendererError(message);
        setRendererStatus('error');
      },
      onReady: () => {
        setRendererError(null);
        setRendererStatus('webgpu');
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
      engineStopNotifiedRef,
      frameRequestedRef,
      gpuRendererRef,
      layoutRef,
      pickerPositionVersionRef,
      pickerRef,
      pluginForcesRef,
      positionVersionRef,
      propsRef,
      rendererOperationalRef,
      requestFrameRef,
      skipPhysicsFrameRef,
      styleVersionRef,
      onRendererError: message => {
        setRendererError(message);
        setRendererStatus('error');
      },
    };
    const frameLoop = startOwnedGraphFrameLoop(frameLoopRuntime, canvas, props.fg2dRef);
    return () => frameLoop.dispose();
  }, [props.fg2dRef]);

  useEffect(() => {
    reconcileOwnedGraphRuntime(layoutRuntime);
  }, [
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
    props.physicsPaused,
    props.physicsSettings?.centerForce,
    props.physicsSettings?.damping,
    props.physicsSettings?.linkDistance,
    props.physicsSettings?.linkForce,
    props.physicsSettings?.repelForce,
    layoutRuntime,
  ]);

  useEffect(() => {
    requestFrameRef.current();
  });

  const interactionHandlers = createOwnedGraphInteractionHandlers({
    cameraRef,
    ctrlClickSessionRef,
    engineStopNotifiedRef,
    hoveredLinkRef,
    hoveredNodeRef,
    layoutRef,
    pickerPositionVersionRef,
    pickerRef,
    pointerSessionRef,
    positionVersionRef,
    propsRef,
    requestFrameRef,
    setLinkTooltip,
    skipPhysicsFrameRef,
  });

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
