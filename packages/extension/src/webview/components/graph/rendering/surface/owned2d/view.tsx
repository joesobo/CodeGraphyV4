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
import type { FGLink, FGNode } from '../../../model/build';
import {
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  screenToGraph,
  type OwnedGraphCamera,
} from './camera';
import type { OwnedGraph2dControls, OwnedGraphNodeStyle, Surface2dProps } from './contracts';
import { drawOwnedGraph, drawOwnedGraphLabels, drawOwnedGraphOverlay } from './drawing';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  updateOwnedGraphLayout,
  type OwnedGraphLayout,
} from './layout';
import { pickOwnedGraphLink } from './linkPicking';
import { OwnedGraphNodePicker } from './picking';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

interface PointerSession {
  draggedIndexes: Set<number>;
  index: number | null;
  link: FGLink | null;
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

function defaultNodeStyle(node: FGNode): OwnedGraphNodeStyle {
  return {
    borderColor: node.borderColor,
    borderWidth: node.borderWidth,
    fillColor: node.color,
    fillOpacity: node.fillOpacity2D ?? 1,
    height: node.shapeSize2D?.height ?? node.size * 2,
    opacity: node.baseOpacity,
    shape: node.shape2D ?? 'circle',
    width: node.shapeSize2D?.width ?? node.size * 2,
  };
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
  const hoveredLinkRef = useRef<FGLink | null>(null);
  const engineStopNotifiedRef = useRef(false);
  const hasFittedCameraRef = useRef(false);
  const positionVersionRef = useRef(0);
  const styleVersionRef = useRef(0);
  const pickerPositionVersionRef = useRef(-1);
  const pickerRef = useRef(new OwnedGraphNodePicker());
  const [layoutKind, setLayoutKind] = useState<OwnedGraphLayout['kind']>('main-thread');
  const [rendererKind, setRendererKind] = useState<'canvas2d' | 'webgpu'>('canvas2d');
  const [linkTooltip, setLinkTooltip] = useState<{
    link: FGLink;
    screen: { x: number; y: number };
  } | null>(null);
  propsRef.current = props;
  styleVersionRef.current += 1;

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
      if (tick.steps > 0) positionVersionRef.current += 1;
      const physicsEndedAt = perfSamples ? performance.now() : 0;
      syncOwnedLayoutNodes(layout);
      if (pickerPositionVersionRef.current !== positionVersionRef.current) {
        pickerRef.current.rebuild(layout.nodes);
        pickerPositionVersionRef.current = positionVersionRef.current;
      }
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
            directionMode: currentProps.directionMode,
            getArrowColor: currentProps.getArrowColor,
            getLinkColor: currentProps.getLinkColor,
            getLinkWidth: currentProps.getLinkWidth,
            getNodeStyle: currentProps.getNodeStyle ?? defaultNodeStyle,
            links: layout.links,
            nodes: layout.nodes,
            positionVersion: positionVersionRef.current,
            styleVersion: styleVersionRef.current,
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
        nodeLabelCanvasObject: currentProps.nodeLabelCanvasObject ?? (() => undefined),
        particleSize: currentProps.particleSize,
        particleSpeed: currentProps.particleSpeed,
        timestamp,
        viewport: {
          maximumX: camera.centerX + width / (2 * camera.zoom),
          maximumY: camera.centerY + height / (2 * camera.zoom),
          minimumX: camera.centerX - width / (2 * camera.zoom),
          minimumY: camera.centerY - height / (2 * camera.zoom),
        },
      };
      if (gpuRendered && layout.nodes.length <= CANVAS_DECORATION_NODE_LIMIT) {
        drawOwnedGraphOverlay(drawingOptions);
      } else if (gpuRendered) {
        drawOwnedGraphLabels(drawingOptions);
      } else {
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
    const currentProps = propsRef.current;
    const nodes = currentProps.sharedProps.graphData.nodes;
    const links = currentProps.sharedProps.graphData.links;
    const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
    let layout = layoutRef.current;
    const updated = layout && updateOwnedGraphLayout(
      layout,
      nodes,
      links,
      settings,
      currentProps.sharedProps.dagMode ?? null,
      currentProps.sharedProps.dagLevelDistance ?? 60,
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
      );
      layoutRef.current = layout;
    }
    positionVersionRef.current += 1;
    setLayoutKind(layout.kind);
    syncOwnedLayoutNodes(layout);
    const canvas = canvasRef.current;
    if (canvas && !hasFittedCameraRef.current) {
      const size = canvasSize(canvas);
      fitOwnedGraphCamera(cameraRef.current, nodes, size.width, size.height);
      hasFittedCameraRef.current = true;
    }
    if (currentProps.physicsPaused) layout.engine.pause();
    engineStopNotifiedRef.current = false;
    requestFrameRef.current();
  }, [
    props.sharedProps.dagLevelDistance,
    props.sharedProps.dagMode,
    props.sharedProps.graphData,
  ]);

  useEffect(() => () => {
    layoutRef.current?.engine.dispose?.();
    layoutRef.current = null;
  }, []);

  useEffect(() => {
    const engine = layoutRef.current?.engine;
    if (!engine) return;
    const currentProps = propsRef.current;
    applyOwnedPhysicsSettings(
      engine,
      currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS,
    );
    if (currentProps.physicsPaused) {
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
    const picked = pickerRef.current.pick(world, cameraRef.current.zoom);
    const pickedLink = picked ? undefined : pickOwnedGraphLink(layout.links, world, cameraRef.current.zoom);
    pointerSessionRef.current = {
      draggedIndexes: new Set(picked ? [picked.index] : []),
      index: picked?.index ?? null,
      link: pickedLink?.link ?? null,
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
      positionVersionRef.current += 1;
      layout.engine.pin(session.index);
      layout.engine.reheat();
      node.x = world.x;
      node.y = world.y;
      node.fx = world.x;
      node.fy = world.y;
      propsRef.current.sharedProps.onNodeDrag?.(node, translate);
      for (let index = 0; index < layout.nodes.length; index += 1) {
        const draggedNode = layout.nodes[index];
        if (draggedNode.isDragging !== true) continue;
        if (Number.isFinite(draggedNode.x) && Number.isFinite(draggedNode.y)) {
          layout.engine.setNodePosition(index, draggedNode.x as number, draggedNode.y as number);
          layout.engine.pin(index);
          session.draggedIndexes.add(index);
        }
      }
      engineStopNotifiedRef.current = false;
      requestFrameRef.current();
      return;
    }

    if (session) {
      session.moved ||= Math.hypot(
        screen.x - session.startScreen.x,
        screen.y - session.startScreen.y,
      ) > 3;
    }
    const hovered = pickerRef.current.pick(world, cameraRef.current.zoom)?.node ?? null;
    const hoveredLink = hovered
      ? null
      : pickOwnedGraphLink(layout.links, world, cameraRef.current.zoom)?.link ?? null;
    if (hovered !== hoveredNodeRef.current) {
      hoveredNodeRef.current = hovered;
      propsRef.current.sharedProps.onNodeHover(hovered);
      requestFrameRef.current();
    }
    if (hoveredLink !== hoveredLinkRef.current) {
      hoveredLinkRef.current = hoveredLink;
      setLinkTooltip(hoveredLink ? { link: hoveredLink, screen } : null);
    } else if (hoveredLink) {
      setLinkTooltip(current => current
        ? { ...current, screen }
        : { link: hoveredLink, screen });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const layout = layoutRef.current;
    const session = pointerSessionRef.current;
    pointerSessionRef.current = null;
    if (!layout || !session) return;
    if (session.index === null) {
      if (!session.moved && session.link) {
        propsRef.current.sharedProps.onLinkClick(session.link, event.nativeEvent);
      } else if (!session.moved) {
        propsRef.current.sharedProps.onBackgroundClick(event.nativeEvent);
      }
      return;
    }

    const node = layout.nodes[session.index];
    if (session.moved) {
      propsRef.current.sharedProps.onNodeDragEnd?.(node);
    } else {
      propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
    }
    for (const index of session.draggedIndexes) {
      const draggedNode = layout.nodes[index];
      if (draggedNode.isPinned === true) continue;
      draggedNode.fx = undefined;
      draggedNode.fy = undefined;
      layout.engine.release(index);
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
    const node = pickerRef.current.pick(world, cameraRef.current.zoom)?.node;
    if (node) {
      propsRef.current.sharedProps.onNodeRightClick(node, event.nativeEvent);
      return;
    }
    const link = pickOwnedGraphLink(layout.links, world, cameraRef.current.zoom)?.link;
    if (link) propsRef.current.sharedProps.onLinkRightClick(link, event.nativeEvent);
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
      data-codegraphy-layout={layoutKind}
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
          hoveredLinkRef.current = null;
          setLinkTooltip(null);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
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
