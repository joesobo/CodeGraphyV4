import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../shared/settings/physics';
import type { FGNode } from '../../../model/build';
import {
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  screenToGraph,
  type OwnedGraphCamera,
} from './camera';
import type { OwnedGraph2dControls, Surface2dProps } from './contracts';
import { drawOwnedGraph, drawOwnedGraphOverlay } from './drawing';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  type OwnedGraphLayout,
} from './layout';
import { pickOwnedGraphNode } from './picking';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

interface PointerSession {
  index: number | null;
  lastWorld: { x: number; y: number };
  moved: boolean;
  startScreen: { x: number; y: number };
}

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };
const CANVAS_DECORATION_NODE_LIMIT = 5_000;

function canvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const bounds = canvas.getBoundingClientRect();
  return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
}

function localPointer(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent | WheelEvent | MouseEvent, 'clientX' | 'clientY'>,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

export function OwnedGraphSurface2d(props: Surface2dProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRendererRef = useRef<OwnedWebGpuRenderer | null>(null);
  const propsRef = useRef(props);
  const layoutRef = useRef<OwnedGraphLayout | null>(null);
  const cameraRef = useRef<OwnedGraphCamera>({ ...INITIAL_CAMERA });
  const animationFrameRef = useRef<number | null>(null);
  const requestFrameRef = useRef<() => void>(() => undefined);
  const skipPhysicsFrameRef = useRef(false);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const engineStopNotifiedRef = useRef(false);
  const [rendererKind, setRendererKind] = useState<'canvas2d' | 'webgpu'>('canvas2d');
  propsRef.current = props;

  useEffect(() => {
    const gpuCanvas = gpuCanvasRef.current;
    if (!gpuCanvas) return;
    let active = true;
    void OwnedWebGpuRenderer.create(gpuCanvas, {
      onDeviceLost: message => {
        console.warn('[CodeGraphy] WebGPU device lost; using Canvas2D fallback.', message);
        gpuRendererRef.current = null;
        setRendererKind('canvas2d');
        requestFrameRef.current();
      },
    }).then(renderer => {
      if (!active) {
        renderer?.dispose();
        return;
      }
      if (!renderer) return;
      gpuRendererRef.current = renderer;
      setRendererKind('webgpu');
      requestFrameRef.current();
    }).catch(error => {
      console.warn('[CodeGraphy] WebGPU initialization failed; using Canvas2D fallback.', error);
    });
    return () => {
      active = false;
      gpuRendererRef.current?.dispose();
      gpuRendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let previousTimestamp: number | null = null;

    const renderFrame = (timestamp: number): void => {
      animationFrameRef.current = null;
      if (!active) return;
      const currentProps = propsRef.current;
      const layout = layoutRef.current;
      const context = canvas.getContext('2d');
      if (!layout || !context) return;
      const elapsedMs = previousTimestamp === null ? 1000 / 60 : timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      const perfWindow = window as typeof window & {
        __CODEGRAPHY_WEBGPU_PERF__?: Array<Record<string, number>>;
      };
      const perfSamples = perfWindow.__CODEGRAPHY_WEBGPU_PERF__;
      const physicsStartedAt = perfSamples ? performance.now() : 0;
      const skipPhysics = skipPhysicsFrameRef.current;
      skipPhysicsFrameRef.current = false;
      const tick = skipPhysics
        ? { moving: !layout.engine.settled, settled: layout.engine.settled, steps: 0 }
        : layout.engine.tick(elapsedMs);
      const physicsEndedAt = perfSamples ? performance.now() : 0;
      syncOwnedLayoutNodes(layout);
      const syncEndedAt = perfSamples ? performance.now() : 0;

      const { width, height } = canvasSize(canvas);
      const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const backingWidth = Math.max(1, Math.round(width * devicePixelRatio));
      const backingHeight = Math.max(1, Math.round(height * devicePixelRatio));
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const camera = cameraRef.current;
      const gpuStartedAt = perfSamples ? performance.now() : 0;
      let gpuRendered = false;
      const gpuRenderer = gpuRendererRef.current;
      if (gpuRenderer) {
        try {
          gpuRenderer.render({
            backgroundColor: currentProps.backgroundColor,
            camera,
            cssHeight: height,
            cssWidth: width,
            devicePixelRatio,
            getLinkColor: currentProps.getLinkColor,
            getLinkWidth: currentProps.getLinkWidth,
            links: layout.links,
            nodes: layout.nodes,
          });
          gpuRendered = true;
        } catch (error) {
          console.warn('[CodeGraphy] WebGPU frame failed; using Canvas2D fallback.', error);
          gpuRenderer.dispose();
          gpuRendererRef.current = null;
          setRendererKind('canvas2d');
        }
      }
      const gpuEndedAt = perfSamples ? performance.now() : 0;
      if (!gpuRendered) {
        context.fillStyle = currentProps.backgroundColor;
        context.fillRect(0, 0, width, height);
      }
      context.save();
      context.translate(width / 2, height / 2);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-camera.centerX, -camera.centerY);
      const drawingOptions = {
        context,
        directionMode: currentProps.directionMode,
        getArrowColor: currentProps.getArrowColor,
        getLinkColor: currentProps.getLinkColor,
        getLinkParticles: currentProps.getLinkParticles,
        getLinkWidth: currentProps.getLinkWidth,
        getParticleColor: currentProps.getParticleColor,
        globalScale: camera.zoom,
        links: layout.links,
        linkCanvasObject: currentProps.linkCanvasObject,
        nodes: layout.nodes,
        nodeCanvasObject: currentProps.nodeCanvasObject,
        particleSize: currentProps.particleSize,
        particleSpeed: currentProps.particleSpeed,
        timestamp,
      };
      if (gpuRendered && layout.nodes.length <= CANVAS_DECORATION_NODE_LIMIT) {
        drawOwnedGraphOverlay(drawingOptions);
      } else if (!gpuRendered) {
        drawOwnedGraph(drawingOptions);
      }
      currentProps.onRenderFramePost(context, camera.zoom);
      context.restore();
      if (perfSamples) {
        perfSamples.push({
          gpuMs: gpuEndedAt - gpuStartedAt,
          overlayMs: performance.now() - gpuEndedAt,
          physicsMs: physicsEndedAt - physicsStartedAt,
          syncMs: syncEndedAt - physicsEndedAt,
        });
        if (perfSamples.length > 240) perfSamples.shift();
      }

      if (tick.settled && !engineStopNotifiedRef.current) {
        engineStopNotifiedRef.current = true;
        currentProps.sharedProps.onEngineStop();
      }
      if ((!tick.settled && !currentProps.physicsPaused) || currentProps.directionMode === 'particles') {
        requestFrameRef.current();
      }
    };

    requestFrameRef.current = () => {
      if (active && animationFrameRef.current === null) {
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
        layoutRef.current?.engine.resume();
        requestFrameRef.current();
      },
      screen2GraphCoords: (x, y) => {
        const size = canvasSize(canvas);
        return screenToGraph(cameraRef.current, size.width, size.height, x, y);
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
    const nodes = props.sharedProps.graphData.nodes as FGNode[];
    const links = props.sharedProps.graphData.links as OwnedGraphLayout['links'];
    const layout = createOwnedGraphLayout(
      nodes,
      links,
      props.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS,
    );
    layoutRef.current = layout;
    syncOwnedLayoutNodes(layout);
    const canvas = canvasRef.current;
    if (canvas) {
      const size = canvasSize(canvas);
      fitOwnedGraphCamera(cameraRef.current, nodes, size.width, size.height);
    }
    if (props.physicsPaused) layout.engine.pause();
    engineStopNotifiedRef.current = false;
    requestFrameRef.current();
  }, [props.sharedProps.graphData]);

  useEffect(() => {
    const engine = layoutRef.current?.engine;
    if (!engine) return;
    applyOwnedPhysicsSettings(
      engine,
      props.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS,
    );
    if (props.physicsPaused) {
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
  }, [props.backgroundColor, props.directionMode, props.particleSize, props.particleSpeed]);

  const screenToWorld = (canvas: HTMLCanvasElement, screen: { x: number; y: number }) => {
    const size = canvasSize(canvas);
    return screenToGraph(cameraRef.current, size.width, size.height, screen.x, screen.y);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 || event.ctrlKey) return;
    const layout = layoutRef.current;
    if (!layout) return;
    const screen = localPointer(event.currentTarget, event.nativeEvent);
    const world = screenToWorld(event.currentTarget, screen);
    const picked = pickOwnedGraphNode(layout.nodes, world, cameraRef.current.zoom);
    pointerSessionRef.current = {
      index: picked?.index ?? null,
      lastWorld: world,
      moved: false,
      startScreen: screen,
    };
    if (picked) {
      layout.engine.pin(picked.index);
      picked.node.fx = picked.node.x;
      picked.node.fy = picked.node.y;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const layout = layoutRef.current;
    if (!layout) return;
    const screen = localPointer(event.currentTarget, event.nativeEvent);
    const world = screenToWorld(event.currentTarget, screen);
    const session = pointerSessionRef.current;
    if (session?.index !== null && session?.index !== undefined) {
      const node = layout.nodes[session.index];
      const translate = {
        x: world.x - session.lastWorld.x,
        y: world.y - session.lastWorld.y,
      };
      session.moved ||= Math.hypot(
        screen.x - session.startScreen.x,
        screen.y - session.startScreen.y,
      ) > 3;
      session.lastWorld = world;
      layout.engine.setNodePosition(session.index, world.x, world.y);
      layout.engine.pin(session.index);
      layout.engine.reheat();
      node.x = world.x;
      node.y = world.y;
      node.fx = world.x;
      node.fy = world.y;
      propsRef.current.sharedProps.onNodeDrag?.(node, translate);
      engineStopNotifiedRef.current = false;
      requestFrameRef.current();
      return;
    }

    const hovered = pickOwnedGraphNode(layout.nodes, world, cameraRef.current.zoom)?.node ?? null;
    if (hovered !== hoveredNodeRef.current) {
      hoveredNodeRef.current = hovered;
      propsRef.current.sharedProps.onNodeHover(hovered);
      requestFrameRef.current();
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const layout = layoutRef.current;
    const session = pointerSessionRef.current;
    pointerSessionRef.current = null;
    if (!layout || !session) return;
    if (session.index === null) {
      if (!session.moved) propsRef.current.sharedProps.onBackgroundClick(event.nativeEvent);
      return;
    }

    const node = layout.nodes[session.index];
    if (session.moved) {
      propsRef.current.sharedProps.onNodeDragEnd?.(node);
    } else {
      propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
    }
    if (node.isPinned !== true) {
      node.fx = undefined;
      node.fy = undefined;
      layout.engine.release(session.index);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    layout.engine.reheat();
    engineStopNotifiedRef.current = false;
    requestFrameRef.current();
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLCanvasElement>): void => {
    const layout = layoutRef.current;
    if (!layout) return;
    event.preventDefault();
    const screen = localPointer(event.currentTarget, event.nativeEvent);
    const world = screenToWorld(event.currentTarget, screen);
    const node = pickOwnedGraphNode(layout.nodes, world, cameraRef.current.zoom)?.node;
    if (node) propsRef.current.sharedProps.onNodeRightClick(node, event.nativeEvent);
    else propsRef.current.sharedProps.onBackgroundRightClick(event.nativeEvent);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>): void => {
    const canvas = event.currentTarget;
    const size = canvasSize(canvas);
    const screen = localPointer(canvas, event.nativeEvent);
    const world = screenToGraph(
      cameraRef.current,
      size.width,
      size.height,
      screen.x,
      screen.y,
    );
    const nextZoom = clampOwnedGraphZoom(
      cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0015),
    );
    cameraRef.current.zoom = nextZoom;
    cameraRef.current.centerX = world.x - (screen.x - size.width / 2) / nextZoom;
    cameraRef.current.centerY = world.y - (screen.y - size.height / 2) / nextZoom;
    skipPhysicsFrameRef.current = true;
    requestFrameRef.current();
  };

  return (
    <div
      className="absolute inset-0"
      data-codegraphy-renderer={rendererKind}
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
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          if (!pointerSessionRef.current && hoveredNodeRef.current) {
            hoveredNodeRef.current = null;
            propsRef.current.sharedProps.onNodeHover(null);
            requestFrameRef.current();
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
