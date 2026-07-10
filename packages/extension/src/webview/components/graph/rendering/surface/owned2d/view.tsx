import {
  useEffect,
  useRef,
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
import type { Surface2dProps } from './contracts';
import { drawOwnedGraph } from './drawing';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  type OwnedGraphLayout,
} from './layout';
import { pickOwnedGraphNode } from './picking';

interface PointerSession {
  index: number | null;
  lastWorld: { x: number; y: number };
  moved: boolean;
  startScreen: { x: number; y: number };
}

interface OwnedGraphControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  d3ReheatSimulation(): void;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  pauseAnimation(): void;
  refresh(): void;
  resumeAnimation(): void;
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  zoom(): number;
  zoom(scale: number, durationMs?: number): unknown;
  zoomToFit(durationMs?: number, padding?: number): void;
}

const INITIAL_CAMERA: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

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
  const propsRef = useRef(props);
  const layoutRef = useRef<OwnedGraphLayout | null>(null);
  const cameraRef = useRef<OwnedGraphCamera>({ ...INITIAL_CAMERA });
  const animationFrameRef = useRef<number | null>(null);
  const requestFrameRef = useRef<() => void>(() => undefined);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const engineStopNotifiedRef = useRef(false);
  propsRef.current = props;

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
      const tick = layout.engine.tick(elapsedMs);
      syncOwnedLayoutNodes(layout);

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
      context.fillStyle = currentProps.backgroundColor;
      context.fillRect(0, 0, width, height);
      const camera = cameraRef.current;
      context.save();
      context.translate(width / 2, height / 2);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-camera.centerX, -camera.centerY);
      drawOwnedGraph({
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
      });
      currentProps.onRenderFramePost(context, camera.zoom);
      context.restore();

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

    const controls: OwnedGraphControls = {
      centerAt: (x, y) => {
        cameraRef.current.centerX = x;
        cameraRef.current.centerY = y;
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
        requestFrameRef.current();
        return controls;
      }) as OwnedGraphControls['zoom'],
      zoomToFit: (_durationMs, padding) => {
        const size = canvasSize(canvas);
        fitOwnedGraphCamera(
          cameraRef.current,
          layoutRef.current?.nodes ?? [],
          size.width,
          size.height,
          padding,
        );
        requestFrameRef.current();
      },
    };
    props.fg2dRef.current = controls as unknown as Surface2dProps['fg2dRef']['current'];

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
      if (props.fg2dRef.current === (controls as unknown)) props.fg2dRef.current = undefined;
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
    event.preventDefault();
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
    requestFrameRef.current();
  };

  return (
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
      style={{ backgroundColor: props.backgroundColor, touchAction: 'none' }}
    />
  );
}
