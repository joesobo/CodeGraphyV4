import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { forceCollide, forceX, forceY } from 'd3-force';
import type { IGraphData, IPhysicsSettings } from '../../../../shared/types';
import { ThemeKind, adjustColorForLightTheme } from '../../../hooks/useTheme';
import type { WebviewPluginHost } from '../../../pluginHost';
import {
  calculateNodeSizes,
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthSizeMultiplier,
  toD3Repel,
  type FGLink,
  type FGNode,
} from '../../graphModel';
import {
  as2DExtMethods,
  hasDistanceAndStrength,
  hasStrength,
  setSpriteVisible,
} from '../../graphSupport';
import type { GraphContainerSize } from '../rendering/sharedProps';

type GraphPhysicsInstance = FG2DMethods<FGNode, FGLink> | FG3DMethods<FGNode, FGLink>;

export interface UseGraphRenderingRuntimeOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  dataRef: MutableRefObject<IGraphData>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  getArrowColor: (this: void, link: LinkObject) => string;
  getArrowRelPos: (this: void, link: LinkObject) => number;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphMode: '2d' | '3d';
  highlightVersion: number;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  nodeSizeMode: string;
  particleSize: number;
  particleSpeed: number;
  physicsSettings: IPhysicsSettings;
  pluginHost?: WebviewPluginHost;
  selectedNodesSetRef: MutableRefObject<Set<string>>;
  showLabels: boolean;
  spritesRef: MutableRefObject<Map<string, SpriteText>>;
  theme: ThemeKind;
  favorites: Set<string>;
  directionMode: 'arrows' | 'particles' | 'none';
}

export interface UseGraphRenderingRuntimeResult {
  containerSize: GraphContainerSize;
  renderPluginOverlays(this: void, ctx: CanvasRenderingContext2D, globalScale: number): void;
}

function havePhysicsSettingsChanged(
  previous: IPhysicsSettings | null,
  next: IPhysicsSettings,
): boolean {
  return !previous
    || previous.repelForce !== next.repelForce
    || previous.centerForce !== next.centerForce
    || previous.linkDistance !== next.linkDistance
    || previous.linkForce !== next.linkForce
    || previous.damping !== next.damping;
}

function applyPhysicsSettings(
  instance: GraphPhysicsInstance,
  settings: IPhysicsSettings,
): void {
  const chargeForce = instance.d3Force('charge');
  if (hasStrength(chargeForce)) chargeForce.strength(toD3Repel(settings.repelForce));
  const linkForce = instance.d3Force('link');
  if (hasDistanceAndStrength(linkForce)) {
    linkForce.distance(settings.linkDistance);
    linkForce.strength(settings.linkForce);
  }
  const forceXInstance = instance.d3Force('forceX');
  if (hasStrength(forceXInstance)) forceXInstance.strength(settings.centerForce);
  const forceYInstance = instance.d3Force('forceY');
  if (hasStrength(forceYInstance)) forceYInstance.strength(settings.centerForce);
  instance.d3ReheatSimulation();
}

function initPhysics(
  instance: GraphPhysicsInstance,
  settings: IPhysicsSettings,
): void {
  applyPhysicsSettings(instance, settings);
  instance.d3Force('forceX', forceX(0).strength(settings.centerForce));
  instance.d3Force('forceY', forceY(0).strength(settings.centerForce));
  instance.d3Force('collision', forceCollide((node: FGNode) => node.size + 4));
}

export function useGraphRenderingRuntime({
  containerRef,
  dataRef,
  fg2dRef,
  fg3dRef,
  getArrowColor,
  getArrowRelPos,
  getLinkParticles,
  getParticleColor,
  graphDataRef,
  graphMode,
  highlightVersion,
  highlightedNeighborsRef,
  highlightedNodeRef,
  meshesRef,
  nodeSizeMode,
  particleSize,
  particleSpeed,
  physicsSettings,
  pluginHost,
  selectedNodesSetRef,
  showLabels,
  spritesRef,
  theme,
  favorites,
  directionMode,
}: UseGraphRenderingRuntimeOptions): UseGraphRenderingRuntimeResult {
  const [containerSize, setContainerSize] = useState<GraphContainerSize>({ width: 0, height: 0 });
  const physicsInitialisedRef = useRef(false);
  const physicsSettingsRef = useRef(physicsSettings);
  const previousPhysicsRef = useRef<IPhysicsSettings | null>(null);

  physicsSettingsRef.current = physicsSettings;

  useEffect(() => {
    const highlighted = highlightedNodeRef.current;
    for (const [nodeId, mesh] of meshesRef.current) {
      const material = mesh.material as THREE.MeshLambertMaterial;
      const node = graphDataRef.current.nodes.find(graphNode => graphNode.id === nodeId);
      if (!node) continue;
      const isHighlighted = !highlighted
        || nodeId === highlighted
        || highlightedNeighborsRef.current.has(nodeId);
      const isSelected = selectedNodesSetRef.current.has(nodeId);
      if (!isHighlighted) {
        material.color.set('#646464');
        material.opacity = 0.3;
      } else {
        material.color.set(isSelected ? '#ffffff' : node.color);
        material.opacity = 1.0;
      }
    }
  }, [graphDataRef, highlightedNeighborsRef, highlightedNodeRef, highlightVersion, meshesRef, selectedNodesSetRef]);

  useEffect(() => {
    const graph = graphMode === '2d'
      ? fg2dRef.current
      : fg3dRef.current;
    if (!graph || !physicsInitialisedRef.current) return;
    if (!havePhysicsSettingsChanged(previousPhysicsRef.current, physicsSettings)) return;
    previousPhysicsRef.current = { ...physicsSettings };
    applyPhysicsSettings(graph, physicsSettings);
  }, [fg2dRef, fg3dRef, graphMode, physicsSettings]);

  useEffect(() => {
    const nodes = graphDataRef.current.nodes;
    if (nodes.length === 0) return;

    const dataNodeMap = new Map(dataRef.current.nodes.map(node => [node.id, node]));
    const sizes = calculateNodeSizes(
      dataRef.current.nodes,
      dataRef.current.edges,
      nodeSizeMode as Parameters<typeof calculateNodeSizes>[2],
    );
    const isLight = theme === 'light';

    for (const node of nodes) {
      const dataNode = dataNodeMap.get(node.id);
      if (!dataNode) continue;
      const rawColor = isLight ? adjustColorForLightTheme(dataNode.color) : dataNode.color;
      const isFavorite = favorites.has(node.id);
      const isFocused = (dataNode.depthLevel ?? 0) === 0;
      node.size = (sizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(dataNode.depthLevel ?? 0);
      node.color = rawColor;
      node.isFavorite = isFavorite;
      node.borderColor = isFocused
        ? (isLight ? '#2563eb' : '#60a5fa')
        : isFavorite
          ? FAVORITE_BORDER_COLOR
          : rawColor;
      node.borderWidth = isFocused ? 4 : isFavorite ? 3 : 2;
    }
  }, [dataRef, favorites, graphDataRef, nodeSizeMode, theme]);

  useEffect(() => {
    for (const sprite of spritesRef.current.values()) {
      setSpriteVisible(sprite, showLabels);
    }
  }, [showLabels, spritesRef]);

  useEffect(() => {
    if (graphMode !== '2d') return;
    const graph = as2DExtMethods(fg2dRef.current);
    if (!graph) return;
    graph.linkDirectionalArrowLength?.(directionMode === 'arrows' ? 12 : 0);
    graph.linkDirectionalArrowRelPos?.(getArrowRelPos);
    graph.linkDirectionalParticles?.(directionMode === 'particles' ? getLinkParticles : 0);
    graph.linkDirectionalParticleWidth?.(particleSize);
    graph.linkDirectionalParticleSpeed?.(particleSpeed);
    graph.linkDirectionalArrowColor?.(getArrowColor);
    graph.linkDirectionalParticleColor?.(getParticleColor);
    graph.d3ReheatSimulation();
    graph.resumeAnimation?.();
  }, [
    directionMode,
    fg2dRef,
    getArrowColor,
    getArrowRelPos,
    getLinkParticles,
    getParticleColor,
    graphMode,
    particleSize,
    particleSpeed,
  ]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    resizeObserver.observe(element);
    setContainerSize({ width: element.clientWidth, height: element.clientHeight });
    return () => resizeObserver.disconnect();
  }, [containerRef]);

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

  useEffect(() => {
    physicsInitialisedRef.current = false;
    previousPhysicsRef.current = null;
  }, [graphMode]);

  useEffect(() => {
    let frame: number | null = null;

    const tryInit = () => {
      if (physicsInitialisedRef.current) return;
      const instance = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
      if (instance) {
        physicsInitialisedRef.current = true;
        previousPhysicsRef.current = { ...physicsSettingsRef.current };
        initPhysics(instance, physicsSettingsRef.current);
        return;
      }
      frame = requestAnimationFrame(tryInit);
    };

    tryInit();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [fg2dRef, fg3dRef, graphMode]);

  return {
    containerSize,
    renderPluginOverlays,
  };
}
