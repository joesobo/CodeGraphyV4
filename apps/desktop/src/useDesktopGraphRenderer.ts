import {
  createGraphLayoutEngine,
  graphDetailOpacity,
  graphNodeSizeChargeMultiplier,
  graphNodeWorldScale,
  prepareGraphPhysics,
  shouldRenderGraphDetails,
  WebGpuGraphRenderer,
  type GraphRendererCamera,
  type GraphRendererLink,
  type GraphRendererNode,
  type GraphRendererNodeStyle,
} from '@codegraphy-dev/graph-renderer';
import {
  DEFAULT_NODE_SIZE,
  GRAPH_NODE_LABEL_FONT,
  OWNED_GRAPH_COLLISION_RADIUS_PADDING,
  fileIconSize,
  folderIconSize,
  graphNodeLabelTop,
} from '@codegraphy-dev/graph-visuals';
import { useEffect, useRef, useState } from 'react';
import {
  createDesktopGraphNodeVisual,
  desktopGraphLinkColor,
  desktopGraphLinkOpacity,
  desktopGraphLinkWidth,
  desktopGraphNodeSizes,
  type DesktopGraphAppearance,
  type DesktopGraphNodeVisual,
} from './desktopGraphVisuals';
import { resolveMaterialIcon, type MaterialIconData } from './materialIconTheme';
import type { DesktopGraph, DesktopGraphNode } from './model';

interface ResolvedMaterialIcons {
  graph: DesktopGraph;
  icons: ReadonlyMap<string, MaterialIconData>;
}

interface PointerState {
  originX: number;
  originY: number;
  moved: boolean;
  x: number;
  y: number;
}

interface DesktopGraphNodeVisuals {
  highlighted: DesktopGraphNodeVisual;
  muted: DesktopGraphNodeVisual;
  selected: DesktopGraphNodeVisual;
}

const GRAPH_APPEARANCE_DEFAULTS: DesktopGraphAppearance = {
  labelForeground: 'CanvasText',
  labelMutedForeground: 'GrayText',
  linkHighlight: 'Highlight',
  linkMuted: 'GrayText',
  nodeSelectionBorder: 'Highlight',
  stageBackground: 'Canvas',
};

const GRAPH_APPEARANCE_TOKENS = {
  labelForeground: '--cg-graph-label-foreground',
  labelMutedForeground: '--cg-graph-label-muted-foreground',
  linkHighlight: '--cg-graph-link-highlight',
  linkMuted: '--cg-graph-link-muted',
  nodeSelectionBorder: '--cg-graph-node-selection-border',
  stageBackground: '--cg-graph-background',
} satisfies Record<keyof DesktopGraphAppearance, string>;

function fitCamera(x: Float32Array, y: Float32Array, width: number, height: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < x.length; index += 1) {
    const nodeX = x[index];
    const nodeY = y[index];
    if (nodeX === undefined || nodeY === undefined) continue;
    minX = Math.min(minX, nodeX);
    maxX = Math.max(maxX, nodeX);
    minY = Math.min(minY, nodeY);
    maxY = Math.max(maxY, nodeY);
  }
  if (!Number.isFinite(minX)) return { centerX: 0, centerY: 0, zoom: 1 };
  const zoom = Math.max(0.08, Math.min(2.2, Math.min(
    width / Math.max(120, maxX - minX + 100),
    height / Math.max(120, maxY - minY + 100),
  )));
  return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, zoom };
}

function resolveCssColor(value: string, ownerDocument: Document): string {
  const probe = ownerDocument.createElement('span');
  probe.style.color = value;
  probe.style.forcedColorAdjust = 'none';
  ownerDocument.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color.trim();
  probe.remove();
  return resolved || value;
}

function readGraphAppearance(element: Element, forcedColors: boolean): DesktopGraphAppearance {
  const ownerDocument = element.ownerDocument;
  const styles = getComputedStyle(element);
  return Object.fromEntries(Object.entries(GRAPH_APPEARANCE_TOKENS).map(([key, token]) => [
    key,
    resolveCssColor(
      forcedColors
        ? GRAPH_APPEARANCE_DEFAULTS[key as keyof DesktopGraphAppearance]
        : styles.getPropertyValue(token).trim()
          || GRAPH_APPEARANCE_DEFAULTS[key as keyof DesktopGraphAppearance],
      ownerDocument,
    ),
  ])) as unknown as DesktopGraphAppearance;
}

function graphNeighbors(graph: DesktopGraph): Map<string, ReadonlySet<string>> {
  const neighbors = new Map(graph.nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of graph.edges) {
    neighbors.get(edge.from)?.add(edge.to);
    neighbors.get(edge.to)?.add(edge.from);
  }
  return neighbors;
}

function isHighlightedNode(
  nodeId: string,
  selectedId: string | undefined,
  neighbors: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  return selectedId === undefined
    || nodeId === selectedId
    || neighbors.get(selectedId)?.has(nodeId) === true;
}

function imageFromCache(
  cache: Map<string, HTMLImageElement>,
  imageUrl: string,
  schedule: () => void,
): HTMLImageElement | undefined {
  const cached = cache.get(imageUrl);
  if (cached) return cached.complete ? cached : undefined;

  const image = new Image();
  image.addEventListener('load', schedule, { once: true });
  image.src = imageUrl;
  cache.set(imageUrl, image);
  return image.complete ? image : undefined;
}

function resizeOverlayCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): CanvasRenderingContext2D | undefined {
  const width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
  const height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d') ?? undefined;
  context?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context?.clearRect(0, 0, cssWidth, cssHeight);
  return context;
}

export function useDesktopGraphRenderer({
  graph,
  selectedId,
  onSelect,
}: {
  graph: DesktopGraph;
  selectedId?: string;
  onSelect: (id: string) => void;
}): {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLCanvasElement>;
  rendererError: string | undefined;
} {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const redrawRef = useRef<(() => void) | undefined>(undefined);
  const [materialIcons, setMaterialIcons] = useState<ResolvedMaterialIcons>();
  const [physicsReady, setPhysicsReady] = useState(false);
  const [rendererError, setRendererError] = useState<string>();

  useEffect(() => {
    selectedIdRef.current = selectedId;
    redrawRef.current?.();
  }, [selectedId]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let active = true;
    void Promise.all(graph.nodes.map(async node => {
      try {
        const icon = await resolveMaterialIcon(
          node.id,
          node.nodeType === 'folder' ? 'folder' : 'file',
        );
        return icon ? ([node.id, icon] as const) : undefined;
      } catch (error) {
        console.error(`[CodeGraphy] Could not load the Material icon for ${node.id}.`, error);
        return undefined;
      }
    })).then(entries => {
      if (!active) return;
      setMaterialIcons({
        graph,
        icons: new Map(entries.filter(entry => entry !== undefined)),
      });
    });
    return () => { active = false; };
  }, [graph]);

  useEffect(() => {
    let active = true;
    void prepareGraphPhysics()
      .then(() => { if (active) setPhysicsReady(true); })
      .catch(error => {
        if (active) setRendererError(error instanceof Error ? error.message : String(error));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas
      || !overlay
      || graph.nodes.length === 0
      || !physicsReady
      || materialIcons?.graph !== graph) return;

    const resolvedIcons = materialIcons.icons;
    let active = true;
    let animationFrame: number | undefined;
    let framePending = false;
    let continueAfterFrame = false;
    let renderer: WebGpuGraphRenderer | undefined;
    let fitFrames = 90;
    let positionVersion = 0;
    let styleVersion = 0;
    let reducedMotionInitialFrameRendered = false;
    let camera: GraphRendererCamera = { centerX: 0, centerY: 0, zoom: 1 };
    let pointer: PointerState | undefined;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const forcedColors = matchMedia('(forced-colors: active)').matches;
    const appearance = readGraphAppearance(canvas, forcedColors);
    const neighbors = graphNeighbors(graph);
    const sizes = desktopGraphNodeSizes(graph);
    const imageCache = new Map<string, HTMLImageElement>();
    const nodes: GraphRendererNode[] = graph.nodes.map(node => ({ id: node.id }));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const sourceNodeById = new Map(graph.nodes.map(node => [node.id, node]));
    const sourceIndexes: number[] = [];
    const targetIndexes: number[] = [];
    const links: GraphRendererLink[] = [];
    const indexById = new Map(nodes.map((node, index) => [node.id, index]));
    for (const edge of graph.edges) {
      const sourceIndex = indexById.get(edge.from);
      const targetIndex = indexById.get(edge.to);
      const source = nodeById.get(edge.from);
      const target = nodeById.get(edge.to);
      if (sourceIndex === undefined || targetIndex === undefined || !source || !target) continue;
      sourceIndexes.push(sourceIndex);
      targetIndexes.push(targetIndex);
      links.push({ source, target });
    }
    const layout = createGraphLayoutEngine({
      nodeIds: nodes.map(node => node.id),
      radii: Float32Array.from(graph.nodes, node =>
        (sizes.get(node.id) ?? DEFAULT_NODE_SIZE) + OWNED_GRAPH_COLLISION_RADIUS_PADDING),
      chargeStrengthMultipliers: Float32Array.from(graph.nodes, node =>
        graphNodeSizeChargeMultiplier(sizes.get(node.id), DEFAULT_NODE_SIZE)),
      edgeSources: Uint32Array.from(sourceIndexes),
      edgeTargets: Uint32Array.from(targetIndexes),
    });
    const visualsById = new Map<string, DesktopGraphNodeVisuals>(graph.nodes.map(node => {
      const size = sizes.get(node.id) ?? DEFAULT_NODE_SIZE;
      const icon = resolvedIcons.get(node.id);
      return [node.id, {
        highlighted: createDesktopGraphNodeVisual(node, size, icon, false, appearance),
        muted: createDesktopGraphNodeVisual(node, size, icon, false, appearance, false),
        selected: createDesktopGraphNodeVisual(node, size, icon, true, appearance),
      }];
    }));
    const nodeVisual = (node: DesktopGraphNode): DesktopGraphNodeVisual => {
      const visuals = visualsById.get(node.id);
      if (!visuals) throw new Error(`Missing desktop graph visual for ${node.id}.`);
      if (node.id === selectedIdRef.current) return visuals.selected;
      return isHighlightedNode(node.id, selectedIdRef.current, neighbors)
        ? visuals.highlighted
        : visuals.muted;
    };
    const getNodeStyle = (node: GraphRendererNode): GraphRendererNodeStyle => {
      const source = sourceNodeById.get(node.id);
      if (!source) throw new Error(`Missing desktop graph Node ${node.id}.`);
      return nodeVisual(source).style;
    };
    const schedule = (): void => {
      if (!active || framePending) return;
      framePending = true;
      animationFrame = requestAnimationFrame(() => {
        framePending = false;
        draw();
      });
    };
    const drawOverlay = (): void => {
      const cssWidth = Math.max(1, canvas.clientWidth);
      const cssHeight = Math.max(1, canvas.clientHeight);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const context = resizeOverlayCanvas(overlay, cssWidth, cssHeight, devicePixelRatio);
      if (!context) return;

      const visualScale = graphNodeWorldScale(camera.zoom);
      context.save();
      context.translate(cssWidth / 2, cssHeight / 2);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-camera.centerX, -camera.centerY);
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const source = node ? sourceNodeById.get(node.id) : undefined;
        const nodeX = layout.x[index];
        const nodeY = layout.y[index];
        if (!node || !source || nodeX === undefined || nodeY === undefined) continue;
        const visual = nodeVisual(source);
        if (!visual.imageUrl) continue;
        const image = imageFromCache(imageCache, visual.imageUrl, schedule);
        if (!image) continue;

        context.save();
        context.globalAlpha = isHighlightedNode(node.id, selectedIdRef.current, neighbors)
          ? 1
          : 0.15;
        context.translate(nodeX, nodeY);
        context.scale(visualScale, visualScale);
        if (source.nodeType !== 'folder') {
          context.beginPath();
          context.arc(0, 0, visual.size * 0.8, 0, Math.PI * 2);
          context.clip();
        }
        const imageSize = source.nodeType === 'folder'
          ? folderIconSize(visual.size)
          : fileIconSize(visual.size);
        context.drawImage(image, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
        context.restore();
      }
      context.restore();

      if (!shouldRenderGraphDetails(camera.zoom)) return;
      context.font = GRAPH_NODE_LABEL_FONT;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      const detailOpacity = graphDetailOpacity(camera.zoom);
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const source = node ? sourceNodeById.get(node.id) : undefined;
        const nodeX = layout.x[index];
        const nodeY = layout.y[index];
        if (!node || !source || nodeX === undefined || nodeY === undefined) continue;
        const highlighted = isHighlightedNode(node.id, selectedIdRef.current, neighbors);
        const size = sizes.get(node.id) ?? DEFAULT_NODE_SIZE;
        const labelWorldY = graphNodeLabelTop(
          nodeY,
          size * visualScale,
          camera.zoom,
        );
        const screenX = (nodeX - camera.centerX) * camera.zoom + cssWidth / 2;
        const screenY = (labelWorldY - camera.centerY) * camera.zoom + cssHeight / 2;
        context.fillStyle = highlighted
          ? appearance.labelForeground
          : appearance.labelMutedForeground;
        context.globalAlpha = detailOpacity * (highlighted ? 1 : 0.15);
        context.fillText(source.label, screenX, screenY);
      }
      context.globalAlpha = 1;
    };
    const renderFrame = (): void => {
      if (!renderer) return;
      renderer.render({
        backgroundColor: appearance.stageBackground,
        camera,
        cssHeight: Math.max(1, canvas.clientHeight),
        cssWidth: Math.max(1, canvas.clientWidth),
        devicePixelRatio: window.devicePixelRatio,
        directionMode: 'arrows',
        edgeSources: layout.edgeSources,
        edgeTargets: layout.edgeTargets,
        getArrowColor: () => appearance.linkHighlight,
        getLinkColor: link => desktopGraphLinkColor(link, selectedIdRef.current, appearance),
        getLinkOpacity: link => desktopGraphLinkOpacity(link, selectedIdRef.current),
        getLinkWidth: link => desktopGraphLinkWidth(link, selectedIdRef.current),
        getNodeStyle,
        hoveredLink: null,
        hoveredNodeIndex: -1,
        hoveredNodeScale: 1,
        links,
        nodes,
        nodeX: layout.x,
        nodeY: layout.y,
        positionVersion,
        styleVersion,
      });
      drawOverlay();
    };
    const draw = (): void => {
      if (!renderer?.canRender() || !active) return;
      const tick = layout.tick();
      if (tick.steps > 0) positionVersion += 1;
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (!node) continue;
        node.x = layout.x[index];
        node.y = layout.y[index];
      }
      if (fitFrames > 0) {
        camera = fitCamera(layout.x, layout.y, canvas.clientWidth, canvas.clientHeight);
        fitFrames -= 1;
      }
      if (reduceMotion && !tick.settled) {
        if (!reducedMotionInitialFrameRendered) {
          reducedMotionInitialFrameRendered = true;
          continueAfterFrame = true;
          renderFrame();
        } else {
          schedule();
        }
        return;
      }
      continueAfterFrame = !tick.settled;
      renderFrame();
    };
    const redraw = (): void => {
      styleVersion += 1;
      schedule();
    };
    redrawRef.current = redraw;
    const resize = new ResizeObserver(redraw);
    resize.observe(canvas);
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      fitFrames = 0;
      camera.zoom = Math.max(0.05, Math.min(5, camera.zoom * Math.exp(-event.deltaY * 0.001)));
      redraw();
    };
    const onPointerDown = (event: PointerEvent): void => {
      pointer = {
        moved: false,
        originX: event.clientX,
        originY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
      fitFrames = 0;
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!pointer) return;
      const deltaX = event.clientX - pointer.x;
      const deltaY = event.clientY - pointer.y;
      pointer.moved ||= Math.hypot(
        event.clientX - pointer.originX,
        event.clientY - pointer.originY,
      ) > 2;
      camera.centerX -= deltaX / camera.zoom;
      camera.centerY -= deltaY / camera.zoom;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      redraw();
    };
    const onPointerUp = (event: PointerEvent): void => {
      const currentPointer = pointer;
      pointer = undefined;
      if (!currentPointer || currentPointer.moved) return;
      const bounds = canvas.getBoundingClientRect();
      const graphX = (event.clientX - bounds.left - bounds.width / 2) / camera.zoom + camera.centerX;
      const graphY = (event.clientY - bounds.top - bounds.height / 2) / camera.zoom + camera.centerY;
      const visualScale = graphNodeWorldScale(camera.zoom);
      let match: { distance: number; node: DesktopGraphNode } | undefined;
      for (let index = 0; index < graph.nodes.length; index += 1) {
        const node = graph.nodes[index];
        const nodeX = layout.x[index];
        const nodeY = layout.y[index];
        if (!node || node.nodeType === 'folder' || nodeX === undefined || nodeY === undefined) continue;
        const distance = Math.hypot(graphX - nodeX, graphY - nodeY);
        const radius = (sizes.get(node.id) ?? DEFAULT_NODE_SIZE) * visualScale;
        if (distance <= radius && (!match || distance < match.distance)) match = { distance, node };
      }
      if (match) onSelectRef.current(match.node.id);
    };
    const onPointerCancel = (): void => { pointer = undefined; };
    const onKeyDown = (event: KeyboardEvent): void => {
      const panDistance = 40 / camera.zoom;
      if (event.key === 'ArrowLeft') camera.centerX -= panDistance;
      else if (event.key === 'ArrowRight') camera.centerX += panDistance;
      else if (event.key === 'ArrowUp') camera.centerY -= panDistance;
      else if (event.key === 'ArrowDown') camera.centerY += panDistance;
      else if (event.key === '+' || event.key === '=') camera.zoom = Math.min(5, camera.zoom * 1.2);
      else if (event.key === '-' || event.key === '_') camera.zoom = Math.max(0.05, camera.zoom / 1.2);
      else if (event.key === '0') camera = fitCamera(
        layout.x,
        layout.y,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      else return;
      event.preventDefault();
      fitFrames = 0;
      redraw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('keydown', onKeyDown);

    void WebGpuGraphRenderer.create(canvas, {
        onDeviceLost: message => setRendererError(`WebGPU device lost: ${message}`),
        onFrameComplete: () => { if (continueAfterFrame) schedule(); },
        onFrameRejected: () => { if (continueAfterFrame) schedule(); },
        onRendererError: setRendererError,
      })
      .then((created) => {
        if (!active) {
          created?.dispose();
          return;
        }
        renderer = created;
        if (!renderer) setRendererError('WebGPU is unavailable in this macOS webview.');
        else schedule();
      })
      .catch(error => setRendererError(error instanceof Error ? error.message : String(error)));

    return () => {
      active = false;
      redrawRef.current = undefined;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      resize.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('keydown', onKeyDown);
      renderer?.dispose();
      layout.pause();
    };
  }, [graph, materialIcons, physicsReady]);

  return { canvasRef, overlayRef, rendererError };
}
