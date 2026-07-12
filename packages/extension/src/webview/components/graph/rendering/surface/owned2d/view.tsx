import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import {
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  screenToGraph,
  type OwnedGraphCamera,
} from './camera';
import { canvasSize } from './canvasGeometry';
import type { OwnedGraph2dControls, Surface2dProps } from './contracts';
import { releaseOwnedDraggedNodes } from './drag';
import {
  applyOwnedPhysicsSettings,
  canRunOwnedGraphPhysics,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  updateOwnedGraphLayout,
  type OwnedGraphLayout,
} from './layout';
import {
  createOwnedGraphInteractionHandlers,
  type CtrlClickSession,
  type LinkTooltip,
  type PointerSession,
} from './interaction';
import { renderOwnedGraphFrame, type OwnedGraphFrameRuntime } from './frame';
import { OwnedGraphNodePicker } from './picking';
import { createOwnedGraphPluginForces } from './pluginForces';
import { OwnedWebGpuRenderer } from './webgpu/renderer';
import { updateOwnedGraphViewportNode } from './viewportNode';

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
  const [rendererStatus, setRendererStatus] = useState<'error' | 'initializing' | 'webgpu'>(
    'initializing',
  );
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<LinkTooltip | null>(null);
  propsRef.current = props;
  styleVersionRef.current += 1;

  useEffect(() => {
    const gpuCanvas = gpuCanvasRef.current;
    if (!gpuCanvas) return;
    let active = true;
    void OwnedWebGpuRenderer.create(gpuCanvas, {
      onDeviceLost: message => {
        if (!active) return;
        gpuRendererRef.current?.dispose();
        gpuRendererRef.current = null;
        rendererOperationalRef.current = false;
        layoutRef.current?.engine.pause();
        setRendererError(message || 'The WebGPU device was lost.');
        setRendererStatus('error');
        requestFrameRef.current();
      },
      onFrameComplete: () => {
        if (active && frameRequestedRef.current) requestFrameRef.current();
      },
    }).then(renderer => {
      if (!active) {
        renderer?.dispose();
        return;
      }
      if (!renderer) {
        rendererOperationalRef.current = false;
        layoutRef.current?.engine.pause();
        setRendererError('WebGPU is unavailable in this environment.');
        setRendererStatus('error');
        return;
      }
      gpuRendererRef.current = renderer;
      rendererOperationalRef.current = true;
      const layout = layoutRef.current;
      if (layout && canRunOwnedGraphPhysics(true, propsRef.current.physicsPaused)) {
        layout.engine.resume();
        layout.engine.reheat();
        engineStopNotifiedRef.current = false;
      }
      setRendererError(null);
      setRendererStatus('webgpu');
      requestFrameRef.current();
    }).catch((error: unknown) => {
      if (!active) return;
      rendererOperationalRef.current = false;
      layoutRef.current?.engine.pause();
      setRendererError(error instanceof Error ? error.message : String(error));
      setRendererStatus('error');
    });
    return () => {
      active = false;
      rendererOperationalRef.current = false;
      gpuRendererRef.current?.dispose();
      gpuRendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let previousTimestamp: number | null = null;

    const frameRuntime: OwnedGraphFrameRuntime = {
      cameraRef,
      engineStopNotifiedRef,
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
    const renderFrame = (timestamp: number): void => {
      animationFrameRef.current = null;
      frameRequestedRef.current = false;
      if (!active) return;
      previousTimestamp = renderOwnedGraphFrame(
        frameRuntime,
        canvas,
        timestamp,
        previousTimestamp,
      );
    };

    requestFrameRef.current = () => {
      frameRequestedRef.current = true;
      const renderer = gpuRendererRef.current;
      if (
        active
        && animationFrameRef.current === null
        && (!renderer || renderer.canRender())
      ) {
        animationFrameRef.current = window.requestAnimationFrame(renderFrame);
      }
    };

    const controls: OwnedGraph2dControls = {
      centerAt: (x, y) => {
        cameraRef.current.centerX = x;
        cameraRef.current.centerY = y;
        skipPhysicsFrameRef.current = true;
        requestFrameRef.current();
      },
      d3ReheatSimulation: () => {
        layoutRef.current?.engine.reheat();
        engineStopNotifiedRef.current = false;
        requestFrameRef.current();
      },
      graph2ScreenCoords: (x, y) => {
        const size = canvasSize(canvas);
        return graphToScreen(cameraRef.current, size.width, size.height, x, y);
      },
      pauseAnimation: () => layoutRef.current?.engine.pause(),
      refresh: () => requestFrameRef.current(),
      resumeAnimation: () => {
        if (!rendererOperationalRef.current) return;
        layoutRef.current?.engine.resume();
        requestFrameRef.current();
      },
      screen2GraphCoords: (x, y) => {
        const size = canvasSize(canvas);
        return screenToGraph(cameraRef.current, size.width, size.height, x, y);
      },
      updateNode: (nodeId, updates) => {
        const updated = updateOwnedGraphViewportNode(layoutRef.current, nodeId, updates);
        if (!updated) return false;
        positionVersionRef.current += 1;
        engineStopNotifiedRef.current = false;
        requestFrameRef.current();
        return true;
      },
      zoom: ((scale?: number) => {
        if (scale === undefined) return cameraRef.current.zoom;
        cameraRef.current.zoom = clampOwnedGraphZoom(scale);
        skipPhysicsFrameRef.current = true;
        requestFrameRef.current();
        return controls;
      }) as OwnedGraph2dControls['zoom'],
      zoomToFit: (_durationMs, padding) => {
        const size = canvasSize(canvas);
        fitOwnedGraphCamera(
          cameraRef.current,
          layoutRef.current?.nodes ?? [],
          size.width,
          size.height,
          padding,
        );
        skipPhysicsFrameRef.current = true;
        requestFrameRef.current();
      },
    };
    props.fg2dRef.current = controls;

    const resizeObserver = new ResizeObserver(() => requestFrameRef.current());
    resizeObserver.observe(canvas);
    requestFrameRef.current();

    return () => {
      active = false;
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (props.fg2dRef.current === controls) props.fg2dRef.current = undefined;
    };
  }, [props.fg2dRef]);

  useEffect(() => {
    const currentProps = propsRef.current;
    const nodes = currentProps.sharedProps.graphData.nodes;
    const links = currentProps.sharedProps.graphData.links;
    const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
    const allowWorker = (currentProps.graphViewContributions?.forces.length ?? 0) === 0;
    let layout = layoutRef.current;
    const updated = layout && updateOwnedGraphLayout(
      layout,
      nodes,
      links,
      settings,
      currentProps.sharedProps.dagMode ?? null,
      currentProps.sharedProps.dagLevelDistance ?? 60,
      allowWorker,
    );
    if (!layout || !updated) {
      layout?.engine.dispose?.();
      layout = createOwnedGraphLayout(
        nodes,
        links,
        settings,
        currentProps.sharedProps.dagMode ?? null,
        currentProps.sharedProps.dagLevelDistance ?? 60,
        () => {
          positionVersionRef.current += 1;
          requestFrameRef.current();
        },
        allowWorker,
      );
      layoutRef.current = layout;
    }
    if (pluginForcesRef.current.sync(
      currentProps.graphViewContributions,
      { nodes: layout.nodes, links: layout.links },
      settings,
    )) layout.engine.reheat();
    const pointerSession = pointerSessionRef.current;
    if (pointerSession?.nodeId) {
      const nextIndex = layout.engine.getNodeIndex(pointerSession.nodeId);
      if (nextIndex === undefined) {
        const draggedIndexes = new Set(
          layout.nodes.flatMap((node, index) => node.isDragging === true ? [index] : []),
        );
        if (pointerSession.moved && pointerSession.node) {
          currentProps.sharedProps.onNodeDragEnd?.(pointerSession.node);
        }
        releaseOwnedDraggedNodes(layout, draggedIndexes);
        pointerSessionRef.current = null;
      } else {
        pointerSession.index = nextIndex;
        pointerSession.node = layout.nodes[nextIndex];
        pointerSession.draggedIndexes = new Set(
          layout.nodes.flatMap((node, index) => node.isDragging === true ? [index] : []),
        );
      }
    } else if (pointerSession?.link) {
      pointerSession.link = layout.links.find(link => link.id === pointerSession.link?.id) ?? null;
    }
    positionVersionRef.current += 1;
    setLayoutKind(layout.kind);
    syncOwnedLayoutNodes(layout);
    const canvas = canvasRef.current;
    if (canvas && !hasFittedCameraRef.current) {
      const size = canvasSize(canvas);
      hasFittedCameraRef.current = fitOwnedGraphCamera(
        cameraRef.current,
        nodes,
        size.width,
        size.height,
      );
    }
    if (!canRunOwnedGraphPhysics(
      rendererOperationalRef.current,
      currentProps.physicsPaused,
    )) layout.engine.pause();
    engineStopNotifiedRef.current = false;
    requestFrameRef.current();
  }, [
    props.sharedProps.dagLevelDistance,
    props.sharedProps.dagMode,
    props.sharedProps.graphData,
    props.graphViewContributions,
  ]);

  useEffect(() => () => {
    pluginForcesRef.current.dispose();
    layoutRef.current?.engine.dispose?.();
    layoutRef.current = null;
  }, []);

  useEffect(() => {
    const engine = layoutRef.current?.engine;
    if (!engine) return;
    const currentProps = propsRef.current;
    const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
    applyOwnedPhysicsSettings(engine, settings);
    const layout = layoutRef.current;
    if (layout) {
      pluginForcesRef.current.sync(
        currentProps.graphViewContributions,
        { nodes: layout.nodes, links: layout.links },
        settings,
      );
    }
    if (!canRunOwnedGraphPhysics(
      rendererOperationalRef.current,
      currentProps.physicsPaused,
    )) {
      engine.pause();
    } else {
      engine.resume();
      engine.reheat();
      engineStopNotifiedRef.current = false;
    }
    requestFrameRef.current();
  }, [
    props.physicsPaused,
    props.physicsSettings?.centerForce,
    props.physicsSettings?.damping,
    props.physicsSettings?.linkDistance,
    props.physicsSettings?.linkForce,
    props.physicsSettings?.repelForce,
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
