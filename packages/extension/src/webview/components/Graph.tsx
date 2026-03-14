/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses react-force-graph-2d (2D canvas) or react-force-graph-3d (WebGL) based on graphMode prop.
 * @module webview/components/Graph
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods as FG2DMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { forceCollide, forceX, forceY } from 'd3-force';
import {
  IGraphData,
  IFileInfo,
  IPhysicsSettings,
  ExtensionToWebviewMessage,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  DEFAULT_DIRECTION_COLOR,
} from '../../shared/types';
import { drawShape } from '../lib/shapes2D';
import { getImage } from '../lib/imageCache';
import { createNodeMesh, createImageSprite } from '../lib/shapes3D';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from './ui/context-menu';
import {
  buildGraphContextMenuEntries,
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
  type GraphContextMenuAction,
  type GraphContextMenuEntry,
  type GraphContextSelection,
} from './graphContextMenu';
import {
  getGraphContextActionEffects,
  type GraphContextEffect,
} from './graphContextActionEffects';
import { applyContextEffects as runContextEffects } from './graph/effects/contextMenu';
import { applyInteractionEffects } from './graph/effects/interaction';
import { applyKeyboardEffects } from './graph/effects/keyboard';
import { applyWebviewMessageEffects as runWebviewMessageEffects } from './graph/effects/messages';
import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
  getNodeContextMenuSelection,
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
  type GraphInteractionEffect,
} from './graphInteractionModel';
import { getGraphKeyboardCommand } from './graphKeyboardEffects';
import {
  buildGraphTooltipContext,
  buildGraphTooltipState,
  hideGraphTooltipState,
  type GraphTooltipRect,
  type GraphTooltipState,
} from './graphTooltipModel';
import {
  getGraphWebviewMessageEffects,
  type GraphWebviewMessageEffect,
} from './graphWebviewMessageEffects';
import {
  buildGraphData,
  calculateNodeSizes,
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  type FGLink,
  type FGNode,
  getDepthSizeMultiplier,
  getNodeType,
  resolveDirectionColor,
  toD3Repel,
} from './graphModel';
import {
  applyCursorToGraphSurface,
  as2DExtMethods,
  type GraphCursorStyle,
  hasDistanceAndStrength,
  hasStrength,
  resolveEdgeActionTargetId,
  resolveLinkEndpointId,
  setSpriteVisible,
} from './graphSupport';
import { NodeTooltip } from './NodeTooltip';
import { ThemeKind, adjustColorForLightTheme } from '../hooks/useTheme';
import { postMessage } from '../lib/vscodeApi';
import { exportAsPng } from '../lib/export/exportPng';
import { exportAsSvg } from '../lib/export/exportSvg';
import { exportAsJpeg } from '../lib/export/exportJpeg';
import { exportAsJson } from '../lib/export/exportJson';
import { exportAsMarkdown } from '../lib/export/exportMarkdown';
import { useGraphStore, graphStore } from '../store';
import { WebviewPluginHost } from '../pluginHost';

const DIRECTIONAL_ARROW_LENGTH_2D = 12;
const DIRECTIONAL_ARROW_NODE_GAP_2D = 0;
const RIGHT_CLICK_DRAG_THRESHOLD_PX = 6;
const RIGHT_CLICK_FALLBACK_DELAY_MS = 40;
const NODE_DOUBLE_CLICK_THRESHOLD_MS = 450;

interface GraphProps {
  data: IGraphData;
  theme?: ThemeKind;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  pluginHost?: WebviewPluginHost;
}

type ForceGraph2DRefObject = React.MutableRefObject<FG2DMethods<NodeObject, LinkObject> | undefined>;
type ForceGraph3DRefObject = React.MutableRefObject<FG3DMethods<NodeObject, LinkObject> | undefined>;

// ─── Graph component ────────────────────────────────────────────────────────

export default function Graph({
  data,
  theme = 'dark',
  nodeDecorations,
  edgeDecorations,
  pluginHost,
}: GraphProps): React.ReactElement {
  const favorites = useGraphStore(s => s.favorites);
  const bidirectionalMode = useGraphStore(s => s.bidirectionalMode);
  const physicsSettings = useGraphStore(s => s.physicsSettings);
  const nodeSizeMode = useGraphStore(s => s.nodeSizeMode);
  const directionMode = useGraphStore(s => s.directionMode);
  const directionColor = useGraphStore(s => s.directionColor);
  const particleSpeed = useGraphStore(s => s.particleSpeed);
  const particleSize = useGraphStore(s => s.particleSize);
  const showLabels = useGraphStore(s => s.showLabels);
  const graphMode = useGraphStore(s => s.graphMode);
  const dagMode = useGraphStore(s => s.dagMode);
  const timelineActive = useGraphStore(s => s.timelineActive);
  const pluginContextMenuItems = useGraphStore(s => s.pluginContextMenuItems);
  const timelineActiveRef = useRef(timelineActive);
  timelineActiveRef.current = timelineActive;
  const containerRef = useRef<HTMLDivElement>(null);
  const fg2dRef = useRef<FG2DMethods<FGNode, FGLink> | undefined>(undefined);
  const fg3dRef = useRef<FG3DMethods<FGNode, FGLink> | undefined>(undefined);

  // Refs that canvas callbacks read from (no re-render needed for these)
  const highlightedNodeRef = useRef<string | null>(null);
  const highlightedNeighborsRef = useRef<Set<string>>(new Set());
  const selectedNodesSetRef = useRef<Set<string>>(new Set());
  const themeRef = useRef(theme);
  const directionModeRef = useRef(directionMode);
  const directionColorRef = useRef(directionColor);
  const favoritesRef = useRef(favorites);
  const graphDataRef = useRef<{ nodes: FGNode[]; links: FGLink[] }>({ nodes: [], links: [] });
  const dataRef = useRef(data);
  const nodeSizeModeRef = useRef(nodeSizeMode);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredNodeRef = useRef<FGNode | null>(null);
  const tooltipRafRef = useRef<number | null>(null);
  const fileInfoCacheRef = useRef<Map<string, IFileInfo>>(new Map());
  const physicsInitialisedRef = useRef(false);
  const prevPhysicsRef = useRef<IPhysicsSettings | null>(null);
  const physicsSettingsRef = useRef(physicsSettings);
  physicsSettingsRef.current = physicsSettings;
  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const lastGraphContextEventRef = useRef<number>(0);
  const lastContainerContextMenuEventRef = useRef<number>(0);
  const rightClickFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightMouseDownRef = useRef<{
    x: number;
    y: number;
    ctrlKey: boolean;
    moved: boolean;
  } | null>(null);
  const graphCursorRef = useRef<GraphCursorStyle>('default');
  const showLabelsRef = useRef(showLabels);
  /** Stores 3D SpriteText objects by node id so we can toggle visibility without rebuilding */
  const spritesRef = useRef<Map<string, SpriteText>>(new Map());
  /** Stores 3D mesh refs for highlight color updates */
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const nodeDecorationsRef = useRef(nodeDecorations);
  const edgeDecorationsRef = useRef(edgeDecorations);

  themeRef.current = theme;
  directionModeRef.current = directionMode;
  directionColorRef.current = directionColor;
  showLabelsRef.current = showLabels;
  favoritesRef.current = favorites;
  dataRef.current = data;
  nodeSizeModeRef.current = nodeSizeMode;
  nodeDecorationsRef.current = nodeDecorations;
  edgeDecorationsRef.current = edgeDecorations;

  // React state (triggers re-renders only where needed)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [contextSelection, setContextSelection] = useState<GraphContextSelection>(() =>
    makeBackgroundContextSelection()
  );
  const [tooltipData, setTooltipData] = useState<GraphTooltipState>({
    visible: false,
    nodeRect: { x: 0, y: 0, radius: 0 },
    path: '',
    info: null,
    pluginSections: [],
  });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageCacheVersion, setImageCacheVersion] = useState(0);
  const triggerImageRerender = useCallback(() => {
    setImageCacheVersion(prev => prev + 1);
  }, []);

  // ── Build graphData for force-graph ─────────────────────────────────────
  // Only rebuilds when topology changes (data or bidirectionalMode).
  // Visual-only changes (theme, favorites, nodeSizeMode) update nodes in-place
  // via a separate effect to avoid restarting the physics simulation.

  const graphData = useMemo(() => {
    const nextGraphData = buildGraphData({
      data,
      nodeSizeMode: nodeSizeModeRef.current,
      theme: themeRef.current,
      favorites: favoritesRef.current,
      bidirectionalMode,
      timelineActive: timelineActiveRef.current,
      previousNodes: graphDataRef.current.nodes,
    });

    graphDataRef.current = nextGraphData;
    return nextGraphData;
  }, [data, bidirectionalMode]);

  // During timeline playback, dampen the simulation alpha after data changes
  // so existing nodes barely move when new nodes are added/removed.
  useEffect(() => {
    if (!timelineActive) return;
    const fg = as2DExtMethods(fg2dRef.current);
    if (fg) {
      // Let force-graph process the new data first, then dampen alpha
      requestAnimationFrame(() => {
        fg.d3Alpha?.(0.05);
      });
    }
  }, [data, timelineActive]);

  // ── 2D canvas rendering callbacks ────────────────────────────────────────

  const nodeCanvasObject = useCallback((
    node: FGNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const highlighted = highlightedNodeRef.current;
    const isHighlighted = !highlighted ||
      node.id === highlighted ||
      highlightedNeighborsRef.current.has(node.id);
    const isSelected = selectedNodesSetRef.current.has(node.id);
    const deco = nodeDecorationsRef.current?.[node.id];
    const baseOpacity = deco?.opacity ?? (node.baseOpacity ?? 1.0);
    const opacity = isHighlighted ? baseOpacity : 0.15;

    ctx.save();
    ctx.globalAlpha = opacity;

    const shape = node.shape2D ?? 'circle';
    drawShape(ctx, shape, node.x!, node.y!, node.size);
    ctx.fillStyle = deco?.color ?? node.color;
    ctx.fill();

    const borderColor = isSelected
      ? (themeRef.current === 'light' ? '#000000' : '#ffffff')
      : node.borderColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = (isSelected ? Math.max(node.borderWidth, 3) : node.borderWidth) / globalScale;
    ctx.stroke();

    // Image overlay (clipped to shape)
    if (node.imageUrl) {
      const img = getImage(node.imageUrl, triggerImageRerender);
      if (img) {
        ctx.save();
        drawShape(ctx, shape, node.x!, node.y!, node.size * 0.8);
        ctx.clip();
        const imgSize = node.size * 1.2;
        ctx.drawImage(img, node.x! - imgSize / 2, node.y! - imgSize / 2, imgSize, imgSize);
        ctx.restore();
      }
    }

    // Label — fades in smoothly as user zooms in
    const labelText = deco?.label?.text ?? node.label;
    if (showLabelsRef.current) {
      const labelPx = 12 / globalScale;
      // Start appearing at globalScale ~1.0, fully visible at ~2.0
      const labelOpacity = Math.min(1, Math.max(0, (globalScale - 0.8) / 1.2));
      if (labelOpacity > 0.01) {
        ctx.font = `${labelPx}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const isLight = themeRef.current === 'light';
        const baseColor = isHighlighted
          ? (isLight ? '#1e1e1e' : '#e2e8f0')
          : (isLight ? '#9ca3af' : '#4a5568');
        ctx.globalAlpha = opacity * labelOpacity;
        ctx.fillStyle = deco?.label?.color ?? baseColor;
        ctx.fillText(labelText, node.x!, node.y! + node.size + 2 / globalScale);
      }
    }

    if (pluginHost) {
      const renderer = pluginHost.getNodeRenderer(getNodeType(node.id)) ?? pluginHost.getNodeRenderer('*');
      if (renderer) {
        try {
          renderer({
            node,
            ctx,
            globalScale,
            decoration: deco,
          });
        } catch (error) {
          console.error('[CodeGraphy] Plugin node renderer error:', error);
        }
      }
    }

    ctx.restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginHost, imageCacheVersion, triggerImageRerender]);

  const nodePointerAreaPaint = useCallback((
    node: FGNode,
    color: string,
    ctx: CanvasRenderingContext2D
  ) => {
    ctx.fillStyle = color;
    drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
    ctx.fill();
  }, []);

  /** Custom renderer for bidirectional links only — draws arrows on both ends. */
  const linkCanvasObject = useCallback((
    link: FGLink,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    if (!link.bidirectional || directionModeRef.current !== 'arrows') return;
    const src = link.source as FGNode;
    const tgt = link.target as FGNode;
    if (src?.x == null || src?.y == null || tgt?.x == null || tgt?.y == null) return;

    const highlighted = highlightedNodeRef.current;
    const isConnected = !highlighted || src.id === highlighted || tgt.id === highlighted;
    const isLight = themeRef.current === 'light';
    const edgeDeco = edgeDecorationsRef.current?.[link.id];
    const decoOpacity = edgeDeco?.opacity;

    ctx.save();
    ctx.globalAlpha = decoOpacity ?? (isConnected ? 1 : 0.15);

    const lw = (edgeDeco?.width ?? 2) / globalScale;
    ctx.lineWidth = lw;
    ctx.strokeStyle = edgeDeco?.color ?? (isConnected ? '#60a5fa' : (isLight ? '#d4d4d4' : '#2d3748'));

    // Shorten line to not overlap node circles
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { ctx.restore(); return; }
    const nx = dx / dist;
    const ny = dy / dist;
    const nodeGap = DIRECTIONAL_ARROW_NODE_GAP_2D / globalScale;
    const startInset = src.size + nodeGap;
    const endInset = tgt.size + nodeGap;
    if (dist <= startInset + endInset) {
      ctx.restore();
      return;
    }
    const startX = src.x + nx * startInset;
    const startY = src.y + ny * startInset;
    const endX = tgt.x - nx * endInset;
    const endY = tgt.y - ny * endInset;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (directionModeRef.current === 'arrows') {
      const arrowLen = DIRECTIONAL_ARROW_LENGTH_2D;
      const arrowHalfWidth = arrowLen / 1.6 / 2;
      const arrowVertexLen = arrowLen * 0.2;
      const px = -ny;
      const py = nx;
      const directionalColor = resolveDirectionColor(directionColorRef.current);

      // Arrow at target end (src -> tgt)
      const tailX1 = endX - nx * arrowLen;
      const tailY1 = endY - ny * arrowLen;
      const vertexX1 = endX - nx * arrowVertexLen;
      const vertexY1 = endY - ny * arrowVertexLen;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(tailX1 + px * arrowHalfWidth, tailY1 + py * arrowHalfWidth);
      ctx.lineTo(vertexX1, vertexY1);
      ctx.lineTo(tailX1 - px * arrowHalfWidth, tailY1 - py * arrowHalfWidth);
      ctx.closePath();
      ctx.fillStyle = directionalColor;
      ctx.fill();

      // Arrow at source end (tgt -> src)
      const rnx = -nx;
      const rny = -ny;
      const tailX2 = startX - rnx * arrowLen;
      const tailY2 = startY - rny * arrowLen;
      const vertexX2 = startX - rnx * arrowVertexLen;
      const vertexY2 = startY - rny * arrowVertexLen;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(tailX2 + px * arrowHalfWidth, tailY2 + py * arrowHalfWidth);
      ctx.lineTo(vertexX2, vertexY2);
      ctx.lineTo(tailX2 - px * arrowHalfWidth, tailY2 - py * arrowHalfWidth);
      ctx.closePath();
      ctx.fillStyle = directionalColor;
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // ── Link color/width for unidirectional edges ────────────────────────────

  const getLinkColor = useCallback((link: FGLink) => {
    const edgeDeco = edgeDecorationsRef.current?.[link.id];
    if (edgeDeco?.color) return edgeDeco.color;
    const src = link.source as FGNode;
    const tgt = link.target as FGNode;
    const srcId = typeof link.source === 'string' ? link.source : src?.id;
    const tgtId = typeof link.target === 'string' ? link.target : tgt?.id;
    const highlighted = highlightedNodeRef.current;
    const isLight = themeRef.current === 'light';
    if (!highlighted) return link.baseColor ?? DEFAULT_DIRECTION_COLOR;
    const isConnected = srcId === highlighted || tgtId === highlighted;
    if (isConnected) return '#60a5fa';
    return isLight ? '#e2e8f0' : '#2d3748';
  }, []);

  const getLinkParticles = useCallback((link: LinkObject): number => {
    const edge = link as FGLink;
    const edgeDeco = edgeDecorationsRef.current?.[edge.id];
    return edgeDeco?.particles?.count ?? 3;
  }, []);

  const getArrowRelPos = useCallback((_link: LinkObject): number => {
    // force-graph computes arrow placement against nodeVal/nodeRelSize radii.
    // With nodeVal/nodeRelSize aligned to node.size, relPos=1 lands arrow tips
    // exactly on the target node border.
    return 1;
  }, []);

  const getArrowColor = useCallback((_link: LinkObject): string => {
    return resolveDirectionColor(directionColorRef.current);
  }, []);

  const getParticleColor = useCallback((_link: LinkObject): string => {
    return resolveDirectionColor(directionColorRef.current);
  }, []);

  const getLinkWidth = useCallback((link: FGLink) => {
    const edgeDeco = edgeDecorationsRef.current?.[link.id];
    if (edgeDeco?.width !== undefined) return edgeDeco.width;
    const srcId = typeof link.source === 'string' ? link.source : (link.source as FGNode)?.id;
    const tgtId = typeof link.target === 'string' ? link.target : (link.target as FGNode)?.id;
    const highlighted = highlightedNodeRef.current;
    if (!highlighted) return link.bidirectional ? 2 : 1;
    return (srcId === highlighted || tgtId === highlighted) ? 2 : 1;
  }, []);

  // ── 3D node object (shape mesh + label + optional image sprite) ───────────

  const nodeThreeObject = useCallback((node: FGNode) => {
    const group = new THREE.Group();

    const shape = node.shape3D ?? 'sphere';
    const mesh = createNodeMesh(shape, node.color, node.size / DEFAULT_NODE_SIZE * 4);
    meshesRef.current.set(node.id, mesh);
    group.add(mesh);

    if (node.imageUrl) {
      const imgSprite = createImageSprite(node.imageUrl, node.size / DEFAULT_NODE_SIZE * 6);
      group.add(imgSprite);
    }

    const sprite = new SpriteText(node.label);
    setSpriteVisible(sprite, showLabelsRef.current);
    sprite.color = '#ffffff';
    sprite.textHeight = 6;
    sprite.offsetY = (node.size / DEFAULT_NODE_SIZE) * 8 + 4;
    spritesRef.current.set(node.id, sprite);
    group.add(sprite);

    return group;
  }, []);

  // ── 3D color function ────────────────────────────────────────────────────

  const [highlightVersion, setHighlightVersion] = useState(0);

  // Update 3D mesh colors on highlight changes
  useEffect(() => {
    const highlighted = highlightedNodeRef.current;
    for (const [nodeId, mesh] of meshesRef.current) {
      const mat = mesh.material as THREE.MeshLambertMaterial;
      const node = graphDataRef.current.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      const isHighlighted = !highlighted ||
        nodeId === highlighted ||
        highlightedNeighborsRef.current.has(nodeId);
      const isSelected = selectedNodesSetRef.current.has(nodeId);
      if (!isHighlighted) {
        mat.color.set('#646464');
        mat.opacity = 0.3;
      } else {
        mat.color.set(isSelected ? '#ffffff' : node.color);
        mat.opacity = 1.0;
      }
    }
  }, [highlightVersion]);

  // ── Highlight helpers ────────────────────────────────────────────────────

  const setHighlight = useCallback((nodeId: string | null) => {
    highlightedNodeRef.current = nodeId;
    if (nodeId) {
      const neighbors = new Set<string>();
      for (const link of graphDataRef.current.links) {
        const srcId = typeof link.source === 'string' ? link.source : (link.source as FGNode)?.id;
        const tgtId = typeof link.target === 'string' ? link.target : (link.target as FGNode)?.id;
        if (srcId === nodeId) neighbors.add(tgtId);
        if (tgtId === nodeId) neighbors.add(srcId);
      }
      highlightedNeighborsRef.current = neighbors;
    } else {
      highlightedNeighborsRef.current = new Set();
    }
    if (graphMode === '3d') setHighlightVersion(prev => prev + 1);
  }, [graphMode]);

  const selectOnlyNode = useCallback((nodeId: string) => {
    setHighlight(nodeId);
    selectedNodesSetRef.current = new Set([nodeId]);
    setSelectedNodes([nodeId]);
  }, [setHighlight]);

  // ── Plugin API v2: forward graph interactions to extension ──────────────

  const sendGraphInteraction = useCallback((event: string, eventData: unknown) => {
    postMessage({ type: 'GRAPH_INTERACTION', payload: { event, data: eventData } });
  }, []);

  // ── Node interaction callbacks ───────────────────────────────────────────

  const isMacPlatform = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    []
  );

  const openContextMenuFromGraphCallback = useCallback((event?: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const syntheticContextMenu = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: event?.clientX ?? 0,
      clientY: event?.clientY ?? 0,
      ctrlKey: event?.ctrlKey ?? false,
    });
    container.dispatchEvent(syntheticContextMenu);
  }, []);

  const openNodeContextMenu = useCallback((nodeId: string, event: MouseEvent) => {
    const selection = getNodeContextMenuSelection(nodeId, selectedNodesSetRef.current);
    if (selection.shouldUpdateSelection) {
      selectedNodesSetRef.current = new Set(selection.nodeIds);
      setSelectedNodes(selection.nodeIds);
    }
    setContextSelection(makeNodeContextSelection(nodeId, new Set(selection.nodeIds)));
    lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  }, [openContextMenuFromGraphCallback]);

  const openEdgeContextMenu = useCallback((link: FGLink, event: MouseEvent) => {
    const sourceId = resolveLinkEndpointId(link.from) ?? resolveLinkEndpointId((link as { source?: unknown }).source);
    const targetId = resolveLinkEndpointId(link.to) ?? resolveLinkEndpointId((link as { target?: unknown }).target);
    if (!sourceId || !targetId) return;

    const edgeId = resolveEdgeActionTargetId(link.id, sourceId, targetId, dataRef.current.edges);
    setContextSelection(makeEdgeContextSelection(edgeId, sourceId, targetId));
    lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  }, [openContextMenuFromGraphCallback]);

  const openBackgroundContextMenu = useCallback((event: MouseEvent) => {
    setContextSelection(makeBackgroundContextSelection());
    lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  }, [openContextMenuFromGraphCallback]);

  const focusNodeById = useCallback((nodeId: string) => {
    const node = graphDataRef.current.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (graphMode === '2d') {
      fg2dRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 300);
      fg2dRef.current?.zoom(1.5, 300);
      return;
    }

    fg3dRef.current?.zoomToFit(300, 20, n => (n as FGNode).id === nodeId);
  }, [graphMode]);

  const requestNodeOpenById = useCallback((nodeId: string) => {
    fileInfoCacheRef.current.delete(nodeId);
    postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
  }, []);

  const fitView = useCallback(() => {
    if (graphMode === '2d') {
      fg2dRef.current?.zoomToFit(300, 20);
      return;
    }

    fg3dRef.current?.zoomToFit(300, 20);
  }, [graphMode]);

  const zoom2d = useCallback((factor: number) => {
    const fg = fg2dRef.current;
    if (!fg) return;

    const current = fg.zoom();
    fg.zoom(current * factor, 150);
  }, []);

  const setGraphCursor = useCallback((cursor: GraphCursorStyle) => {
    graphCursorRef.current = cursor;
    const container = containerRef.current;
    if (!container) return;
    applyCursorToGraphSurface(container, cursor);
  }, []);

  const setSelection = useCallback((nodeIds: string[]) => {
    selectedNodesSetRef.current = new Set(nodeIds);
    setSelectedNodes(nodeIds);
  }, []);

  const clearSelection = useCallback(() => {
    setHighlight(null);
    selectedNodesSetRef.current = new Set();
    setSelectedNodes([]);
  }, [setHighlight]);

  const previewNode = useCallback((nodeId: string) => {
    postMessage({ type: 'NODE_SELECTED', payload: { nodeId } });
  }, []);

  const updateAccessCount = useCallback((nodeId: string, accessCount: number) => {
    const nodeIndex = dataRef.current.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex !== -1) {
      dataRef.current.nodes[nodeIndex].accessCount = accessCount;
    }
  }, []);

  const clearRightClickFallbackTimer = useCallback(() => {
    if (rightClickFallbackTimerRef.current !== null) {
      clearTimeout(rightClickFallbackTimerRef.current);
      rightClickFallbackTimerRef.current = null;
    }
  }, []);

  const handleMouseDownCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 2) return;
    clearRightClickFallbackTimer();
    rightMouseDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      ctrlKey: event.ctrlKey,
      moved: false,
    };
  }, [clearRightClickFallbackTimer]);

  const handleMouseMoveCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rightMouseDown = rightMouseDownRef.current;
    if (!rightMouseDown) return;
    if (shouldMarkRightMouseDrag({
      startX: rightMouseDown.x,
      startY: rightMouseDown.y,
      nextX: event.clientX,
      nextY: event.clientY,
      thresholdPx: RIGHT_CLICK_DRAG_THRESHOLD_PX,
    })) {
      rightMouseDown.moved = true;
    }
  }, []);

  const handleMouseUpCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 2) return;
    const rightMouseDown = rightMouseDownRef.current;
    rightMouseDownRef.current = null;
    if (!rightMouseDown || rightMouseDown.moved) return;

    clearRightClickFallbackTimer();
    rightClickFallbackTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (!shouldUseRightClickFallback({
        now,
        lastGraphContextEvent: lastGraphContextEventRef.current,
        lastContainerContextMenuEvent: lastContainerContextMenuEventRef.current,
        fallbackDelayMs: RIGHT_CLICK_FALLBACK_DELAY_MS,
      })) return;

      // Final fallback when graph libraries swallow right-click callbacks/contextmenu bubbling.
      const fallbackEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: rightMouseDown.x,
        clientY: rightMouseDown.y,
        ctrlKey: rightMouseDown.ctrlKey,
      });
      openBackgroundContextMenu(fallbackEvent);
    }, RIGHT_CLICK_FALLBACK_DELAY_MS);
  }, [clearRightClickFallbackTimer, openBackgroundContextMenu]);

  const applyGraphInteractionEffects = useCallback((
    effects: GraphInteractionEffect[],
    options: { event?: MouseEvent; link?: FGLink } = {}
  ) => {
    applyInteractionEffects(effects, {
      openNodeContextMenu,
      openBackgroundContextMenu,
      openEdgeContextMenu,
      selectOnlyNode,
      setSelection,
      clearSelection,
      previewNode,
      openNode: requestNodeOpenById,
      focusNode: focusNodeById,
      sendInteraction: sendGraphInteraction,
    }, options);
  }, [
    clearSelection,
    focusNodeById,
    openBackgroundContextMenu,
    openEdgeContextMenu,
    openNodeContextMenu,
    previewNode,
    requestNodeOpenById,
    selectOnlyNode,
    sendGraphInteraction,
    setSelection,
  ]);

  const handleNodeClick = useCallback((node: FGNode, event: MouseEvent) => {
    const command = getNodeClickCommand({
      nodeId: node.id,
      label: node.label,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
      isMacPlatform,
      selectedNodeIds: selectedNodesSetRef.current,
      lastClick: lastClickRef.current,
      now: Date.now(),
      doubleClickThresholdMs: NODE_DOUBLE_CLICK_THRESHOLD_MS,
    });
    lastClickRef.current = command.nextLastClick;
    applyGraphInteractionEffects(command.effects, { event });
  }, [applyGraphInteractionEffects, isMacPlatform]);

  const handleBackgroundClick = useCallback((event?: MouseEvent) => {
    setGraphCursor('default');
    if (!event) {
      applyGraphInteractionEffects(getBackgroundClickCommand({ ctrlKey: false, isMacPlatform: false }));
      return;
    }

    applyGraphInteractionEffects(
      getBackgroundClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform,
      }),
      { event }
    );
  }, [applyGraphInteractionEffects, isMacPlatform, setGraphCursor]);

  const handleLinkClick = useCallback((link: FGLink, event: MouseEvent) => {
    applyGraphInteractionEffects(
      getLinkClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform,
      }),
      { event, link }
    );
  }, [applyGraphInteractionEffects, isMacPlatform]);

  /** Returns the node's bounding rect in screen coordinates (accounts for zoom). */
  const getNodeScreenRect = useCallback((node: FGNode): GraphTooltipRect | null => {
    const fg = fg2dRef.current;
    const canvas = containerRef.current?.querySelector('canvas');
    if (!fg || !canvas) return null;

    const screen = fg.graph2ScreenCoords(node.x ?? 0, node.y ?? 0);
    const rect = canvas.getBoundingClientRect();
    const zoom = fg.zoom();
    const radius = (node.size ?? DEFAULT_NODE_SIZE) * zoom;
    return { x: screen.x + rect.left, y: screen.y + rect.top, radius };
  }, []);

  /** RAF loop that keeps the tooltip anchored to the hovered node. */
  const startTooltipTracking = useCallback(() => {
    const tick = () => {
      const node = hoveredNodeRef.current;
      if (!node) return;
      const rect = getNodeScreenRect(node);
      if (rect) {
        setTooltipData(prev => prev.visible ? { ...prev, nodeRect: rect } : prev);
      }
      tooltipRafRef.current = requestAnimationFrame(tick);
    };
    tooltipRafRef.current = requestAnimationFrame(tick);
  }, [getNodeScreenRect]);

  const stopTooltipTracking = useCallback(() => {
    if (tooltipRafRef.current !== null) {
      cancelAnimationFrame(tooltipRafRef.current);
      tooltipRafRef.current = null;
    }
  }, []);

  const handleNodeHover = useCallback((node: FGNode | null) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);

    if (!node) {
      setGraphCursor('default');
      hoveredNodeRef.current = null;
      stopTooltipTracking();
      setTooltipData(hideGraphTooltipState);
      sendGraphInteraction('graph:nodeHover', { node: null });
      return;
    }

    setGraphCursor('pointer');
    sendGraphInteraction('graph:nodeHover', { node: { id: node.id, label: node.label } });

    hoveredNodeRef.current = node;
    const nodeId = node.id;
    tooltipTimeoutRef.current = setTimeout(() => {
      const snapshot = dataRef.current;
      const pluginTooltip = pluginHost?.getTooltipContent(buildGraphTooltipContext({
        node,
        snapshot,
      }));
      const tooltipState = buildGraphTooltipState({
        nodeId,
        rect: getNodeScreenRect(node),
        cachedInfo: fileInfoCacheRef.current.get(nodeId) ?? null,
        pluginSections: pluginTooltip?.sections ?? [],
      });
      setTooltipData(tooltipState.tooltipData);
      if (tooltipState.shouldRequestFileInfo) {
        postMessage({ type: 'GET_FILE_INFO', payload: { path: nodeId } });
      }

      startTooltipTracking();
    }, 500);
  }, [getNodeScreenRect, pluginHost, setGraphCursor, startTooltipTracking, stopTooltipTracking, sendGraphInteraction]);

  const handleMouseLeave = useCallback(() => {
    setGraphCursor('default');
  }, [setGraphCursor]);

  // Cleanup tooltip RAF on unmount
  useEffect(() => stopTooltipTracking, [stopTooltipTracking]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      applyCursorToGraphSurface(container, graphCursorRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [graphMode]);

  // ── Context menu ─────────────────────────────────────────────────────────

  const handleNodeRightClick = useCallback((node: FGNode, event: MouseEvent) => {
    openNodeContextMenu(node.id, event);
  }, [openNodeContextMenu]);

  const handleBackgroundRightClick = useCallback((event: MouseEvent) => {
    openBackgroundContextMenu(event);
  }, [openBackgroundContextMenu]);

  const handleLinkRightClick = useCallback((link: FGLink, event: MouseEvent) => {
    openEdgeContextMenu(link, event);
  }, [openEdgeContextMenu]);

  const handleContextMenu = useCallback(() => {
    lastContainerContextMenuEventRef.current = Date.now();

    // Context fallback for environments where graph libs swallow right-click callbacks.
    if (Date.now() - lastGraphContextEventRef.current > 150) {
      setContextSelection(makeBackgroundContextSelection());
    }

    // Tooltip cleanup
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    hoveredNodeRef.current = null;
    stopTooltipTracking();
    setTooltipData(hideGraphTooltipState);
  }, [stopTooltipTracking]);

  useEffect(() => clearRightClickFallbackTimer, [clearRightClickFallbackTimer]);

  const applyContextEffects = useCallback((effects: GraphContextEffect[]) => {
    runContextEffects(effects, {
      clearCachedFile: path => fileInfoCacheRef.current.delete(path),
      focusNode: focusNodeById,
      fitView,
      postMessage,
    });
  }, [fitView, focusNodeById]);

  const handleMenuAction = useCallback((action: GraphContextMenuAction) => {
    applyContextEffects(getGraphContextActionEffects(action, contextSelection.targets));
  }, [applyContextEffects, contextSelection.targets]);

  // ── Physics stop ─────────────────────────────────────────────────────────

  const handleEngineStop = useCallback(() => {
    postMessage({ type: 'PHYSICS_STABILIZED' });
  }, []);

  const applyWebviewMessageEffects = useCallback((effects: GraphWebviewMessageEffect[]) => {
    runWebviewMessageEffects(effects, {
      fitView,
      zoom2d,
      cacheFileInfo: info => fileInfoCacheRef.current.set(info.path, info),
      updateTooltipInfo: info => setTooltipData(prev => ({ ...prev, info })),
      postMessage,
      exportPng: () => exportAsPng(containerRef.current),
      exportSvg: () => exportAsSvg(graphDataRef.current.nodes, graphDataRef.current.links, {
        directionMode: directionModeRef.current,
        directionColor: directionColorRef.current,
        showLabels: showLabelsRef.current,
        theme: themeRef.current,
      }),
      exportJpeg: () => exportAsJpeg(containerRef.current),
      exportJson: () => exportAsJson(dataRef.current),
      exportMarkdown: () => exportAsMarkdown(dataRef.current),
      updateAccessCount,
    });
  }, [fitView, updateAccessCount, zoom2d]);

  // ── Message listener ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      applyWebviewMessageEffects(getGraphWebviewMessageEffects({
        message: event.data,
        graphMode,
        tooltipPath: tooltipData.path,
        graphNodes: graphDataRef.current.nodes,
      }));
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyWebviewMessageEffects, graphMode, tooltipData.path]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const command = getGraphKeyboardCommand({
        key: event.key,
        isMod: event.ctrlKey || event.metaKey,
        shiftKey: event.shiftKey,
        graphMode,
        selectedNodeIds: selectedNodes,
        allNodeIds: graphDataRef.current.nodes.map(node => node.id),
        targetIsEditable:
          event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement,
      });
      if (!command) return;

      if (command.preventDefault) event.preventDefault();
      if (command.stopPropagation) event.stopPropagation();

      applyKeyboardEffects(command.effects, {
        fitView,
        clearSelection,
        openSelectedNodes: nodeIds => {
          nodeIds.forEach(nodeId => {
            requestNodeOpenById(nodeId);
          });
        },
        selectAll: setSelection,
        zoom2d,
        postMessage,
        dispatchStoreMessage: message => {
          graphStore.getState().handleExtensionMessage(message);
        },
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, fitView, selectedNodes, graphMode, requestNodeOpenById, setSelection, zoom2d]);

  // ── Physics settings update ───────────────────────────────────────────────

  useEffect(() => {
    const fg = graphMode === '2d'
      ? fg2dRef.current
      : fg3dRef.current;
    if (!fg || !physicsInitialisedRef.current) return;

    const prev = prevPhysicsRef.current;
    const changed = !prev ||
      prev.repelForce !== physicsSettings.repelForce ||
      prev.centerForce !== physicsSettings.centerForce ||
      prev.linkDistance !== physicsSettings.linkDistance ||
      prev.linkForce !== physicsSettings.linkForce ||
      prev.damping !== physicsSettings.damping;
    if (!changed) return;
    prevPhysicsRef.current = { ...physicsSettings };

    const chargeForce = fg.d3Force('charge');
    if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(physicsSettings.repelForce));
    const d3LinkForce = fg.d3Force('link');
    if (hasDistanceAndStrength(d3LinkForce)) {
      d3LinkForce.distance(physicsSettings.linkDistance);
      d3LinkForce.strength(physicsSettings.linkForce);
    }
    const d3ForceX = fg.d3Force('forceX');
    if (hasStrength(d3ForceX)) d3ForceX.strength(physicsSettings.centerForce);
    const d3ForceY = fg.d3Force('forceY');
    if (hasStrength(d3ForceY)) d3ForceY.strength(physicsSettings.centerForce);
    fg.d3ReheatSimulation();
  }, [physicsSettings, graphMode]);

  // ── In-place visual update (no simulation restart) ───────────────────────
  // When nodeSizeMode, favorites, or theme changes, update existing node
  // objects directly so physics positions are preserved.

  useEffect(() => {
    const nodes = graphDataRef.current.nodes;
    if (nodes.length === 0) return;

    const dataNodeMap = new Map(dataRef.current.nodes.map(n => [n.id, n]));
    const sizes = calculateNodeSizes(dataRef.current.nodes, dataRef.current.edges, nodeSizeMode);
    const isLight = theme === 'light';

    for (const node of nodes) {
      const dn = dataNodeMap.get(node.id);
      if (!dn) continue;
      const rawColor = isLight ? adjustColorForLightTheme(dn.color) : dn.color;
      const isFav = favorites.has(node.id);
      const isFocused = dn.depthLevel === 0;
      node.size = (sizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(dn.depthLevel);
      node.color = rawColor;
      node.isFavorite = isFav;
      node.borderColor = isFocused
        ? (isLight ? '#2563eb' : '#60a5fa')
        : isFav
        ? FAVORITE_BORDER_COLOR
        : rawColor;
      node.borderWidth = isFocused ? 4 : isFav ? 3 : 2;
    }

    // Both 2D (canvas) and 3D (Three.js) run continuous render loops — in-place
    // node mutations are picked up automatically on the next frame, no refresh() needed.
  }, [nodeSizeMode, favorites, theme]);

  // ── 3D label visibility toggle (no prop change = no node rebuild) ─────────

  useEffect(() => {
    for (const sprite of spritesRef.current.values()) {
      setSpriteVisible(sprite, showLabels);
    }
  }, [showLabels]);

  // Sync direction visuals imperatively in 2D; the React wrapper can keep
  // stale directional settings until methods are invoked on the graph instance.
  useEffect(() => {
    if (graphMode !== '2d') return;
    const fg = as2DExtMethods(fg2dRef.current);
    if (!fg) return;
    fg.linkDirectionalArrowLength?.(directionMode === 'arrows' ? DIRECTIONAL_ARROW_LENGTH_2D : 0);
    fg.linkDirectionalArrowRelPos?.(getArrowRelPos);
    fg.linkDirectionalParticles?.(directionMode === 'particles' ? getLinkParticles : 0);
    fg.linkDirectionalParticleWidth?.(particleSize);
    fg.linkDirectionalParticleSpeed?.(particleSpeed);
    fg.linkDirectionalArrowColor?.(getArrowColor);
    fg.linkDirectionalParticleColor?.(getParticleColor);
    fg.d3ReheatSimulation();
    fg.resumeAnimation?.();
  }, [graphMode, directionMode, particleSpeed, particleSize, getArrowColor, getParticleColor, getLinkParticles, getArrowRelPos]);

  // ── Container size tracking ───────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const renderPluginOverlays = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!pluginHost) return;
    const overlays = pluginHost.getOverlays();
    if (overlays.length === 0) return;

    for (const overlay of overlays) {
      try {
        overlay.fn({
          ctx,
          width: ctx.canvas.width,
          height: ctx.canvas.height,
          globalScale,
        });
      } catch (error) {
        console.error('[CodeGraphy] Plugin overlay renderer error:', error);
      }
    }
  }, [pluginHost]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isLight = theme === 'light';
  const bgColor = isLight ? '#f5f5f5' : '#18181b';
  const borderColor = isLight ? '#d4d4d4' : 'rgb(63, 63, 70)';

  const menuEntries = useMemo(
    () =>
      buildGraphContextMenuEntries({
        selection: contextSelection,
        timelineActive,
        favorites,
        pluginItems: pluginContextMenuItems,
      }),
    [contextSelection, timelineActive, favorites, pluginContextMenuItems]
  );

  // Shared force-graph props
  const sharedProps = {
    graphData: graphData as unknown as { nodes: NodeObject[]; links: LinkObject[] },
    width: containerSize.width || undefined,
    height: containerSize.height || undefined,
    onNodeClick: handleNodeClick as (node: NodeObject, event: MouseEvent) => void,
    onNodeRightClick: handleNodeRightClick as unknown as (node: NodeObject, event: MouseEvent) => void,
    onLinkClick: handleLinkClick as unknown as (link: LinkObject, event: MouseEvent) => void,
    onLinkRightClick: handleLinkRightClick as unknown as (link: LinkObject, event: MouseEvent) => void,
    onBackgroundClick: handleBackgroundClick,
    onBackgroundRightClick: handleBackgroundRightClick,
    onEngineStop: handleEngineStop,
    d3VelocityDecay: physicsSettings.damping,
    d3AlphaDecay: 0.0228,
    warmupTicks: 0,
    cooldownTicks: timelineActive ? 50 : 500,
    nodeId: 'id' as const,
    onNodeHover: handleNodeHover as (node: NodeObject | null) => void,
    dagMode: dagMode ?? undefined,
    dagLevelDistance: dagMode ? 60 : undefined,
  };

  const initPhysics = useCallback((instance: FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>) => {
    if (physicsInitialisedRef.current) return;
    physicsInitialisedRef.current = true;
    const settings = physicsSettingsRef.current;
    prevPhysicsRef.current = { ...settings };
    const chargeForce = instance.d3Force('charge');
    if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(settings.repelForce));
    const d3LinkForce = instance.d3Force('link');
    if (hasDistanceAndStrength(d3LinkForce)) {
      d3LinkForce.distance(settings.linkDistance);
      d3LinkForce.strength(settings.linkForce);
    }
    // Pull each node toward origin (0,0) instead of just translating the centroid.
    instance.d3Force('forceX', forceX(0).strength(settings.centerForce));
    instance.d3Force('forceY', forceY(0).strength(settings.centerForce));
    // Add collision force to prevent nodes overlapping
    instance.d3Force('collision', forceCollide((node: FGNode) => node.size + 4));
  }, []);

  useEffect(() => {
    physicsInitialisedRef.current = false;
    prevPhysicsRef.current = null;
  }, [graphMode]);

  useEffect(() => {
    let frame: number | null = null;

    const tryInit = () => {
      if (physicsInitialisedRef.current) return;
      const instance = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
      if (instance) {
        initPhysics(instance);
        return;
      }
      frame = requestAnimationFrame(tryInit);
    };

    tryInit();

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [graphMode, initPhysics]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          onMouseLeave={handleMouseLeave}
          onMouseDownCapture={handleMouseDownCapture}
          onMouseMoveCapture={handleMouseMoveCapture}
          onMouseUpCapture={handleMouseUpCapture}
          className="graph-container absolute inset-0 rounded-lg m-1 outline-none focus:outline-none"
          style={{ backgroundColor: bgColor, borderWidth: 1, borderStyle: 'solid', borderColor, cursor: 'default' }}
          tabIndex={0}
        >
          {graphMode === '2d' ? (
            <ForceGraph2D
              ref={fg2dRef as unknown as ForceGraph2DRefObject}
              {...sharedProps}
              backgroundColor={bgColor}
              nodeCanvasObject={nodeCanvasObject as (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void}
              nodeCanvasObjectMode={() => 'replace'}
              nodePointerAreaPaint={nodePointerAreaPaint as (node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => void}
              nodeVal={(node) => {
                const radius = (node as FGNode).size ?? DEFAULT_NODE_SIZE;
                return Math.max(1, radius * radius);
              }}
              nodeRelSize={1}
              linkColor={getLinkColor as (link: LinkObject) => string}
              linkWidth={getLinkWidth as (link: LinkObject) => number}
              linkDirectionalArrowLength={directionMode === 'arrows' ? DIRECTIONAL_ARROW_LENGTH_2D : 0}
              linkDirectionalArrowRelPos={getArrowRelPos}
              linkDirectionalArrowColor={getArrowColor}
              linkDirectionalParticles={directionMode === 'particles' ? getLinkParticles : 0}
              linkDirectionalParticleWidth={particleSize}
              linkDirectionalParticleSpeed={particleSpeed}
              linkDirectionalParticleColor={getParticleColor}
              linkCurvature={(link) => (link as FGLink).curvature ?? 0}
              linkCanvasObject={linkCanvasObject as (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => void}
              linkCanvasObjectMode={(link) => {
                const bidirectional = Boolean((link as FGLink).bidirectional);
                return bidirectional && directionMode === 'arrows' ? 'replace' : 'after';
              }}
              onRenderFramePost={renderPluginOverlays}
              autoPauseRedraw={false}
            />
          ) : (
            <ForceGraph3D
              ref={fg3dRef as unknown as ForceGraph3DRefObject}
              {...sharedProps}
              backgroundColor={bgColor}
              nodeVal={(node) => (node as FGNode).size / DEFAULT_NODE_SIZE}
              nodeLabel=""
              nodeThreeObjectExtend={false}
              nodeThreeObject={nodeThreeObject as (node: NodeObject) => THREE.Object3D}
              linkColor={getLinkColor as (link: LinkObject) => string}
              linkWidth={getLinkWidth as (link: LinkObject) => number}
              linkDirectionalArrowLength={directionMode === 'arrows' ? 6 : 0}
              linkDirectionalArrowRelPos={1}
              linkDirectionalArrowColor={getArrowColor}
              linkDirectionalParticles={directionMode === 'particles' ? getLinkParticles : 0}
              linkDirectionalParticleWidth={particleSize}
              linkDirectionalParticleSpeed={particleSpeed}
              linkDirectionalParticleColor={getParticleColor}
              linkCurvature={(link) => (link as FGLink).curvature ?? 0}
              linkCurveRotation="rotation"
            />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {menuEntries.map((entry: GraphContextMenuEntry) => {
          if (entry.kind === 'separator') return <ContextMenuSeparator key={entry.id} />;
          return (
            <ContextMenuItem
              key={entry.id}
              className={entry.destructive ? 'text-red-400 focus:text-red-300' : undefined}
              onClick={() => handleMenuAction(entry.action)}
            >
              {entry.label}
              {entry.shortcut ? <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut> : null}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>

      <NodeTooltip
        path={tooltipData.path}
        size={tooltipData.info?.size}
        lastModified={tooltipData.info?.lastModified}
        incomingCount={tooltipData.info?.incomingCount ?? 0}
        outgoingCount={tooltipData.info?.outgoingCount ?? 0}
        plugin={tooltipData.info?.plugin}
        visits={tooltipData.info?.visits}
        nodeRect={tooltipData.nodeRect}
        visible={tooltipData.visible}
        extraSections={tooltipData.pluginSections}
      />
    </ContextMenu>
  );
}
