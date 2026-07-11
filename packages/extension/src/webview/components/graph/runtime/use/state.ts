import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type * as THREE from 'three';
import type SpriteText from 'three-spritetext';
import type { IFileInfo } from '../../../../../shared/files/info';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from '../../../../../shared/settings/modes';
import type {
  GraphContextSelection,
} from '../../contextMenu/contracts';
import { makeBackgroundContextSelection } from '../../contextMenu/selection';
import { useNodeDecorationIndicators } from './indicators/nodeDecorations';
import {
  buildGraphData,
  type FGLink,
  type FGNode,
} from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import {
  as2DExtMethods,
} from '../../support/contracts/forceGraph';
import type { GraphCursorStyle } from '../../support/dom';
import type { ThemeKind } from '../../../../theme/useTheme';
import { reconcileRuntimeGraphData } from '../data/reconcile';

export interface GraphMouseState {
  ctrlKey: boolean;
  moved: boolean;
  x: number;
  y: number;
}

export interface GraphRuntimeOptions {
  bidirectionalMode: BidirectionalEdgeMode;
  appearance?: GraphAppearance;
  data: IGraphData;
  directionColor: string;
  directionMode: DirectionMode;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  favorites: Set<string>;
  graphViewContributions?: CoreGraphViewContributionSet;
  graphMode?: '2d' | '3d';
  graphResetVersion: number;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  nodeSizeMode: NodeSizeMode;
  showLabels: boolean;
  theme: ThemeKind;
  timelineActive: boolean;
}

const EMPTY_NODE_DECORATIONS: Record<string, NodeDecorationPayload> = {};

export interface GraphRuntimeSelection {
  selectedNodeIds: string[];
  selectedNodeIdsRef: MutableRefObject<Set<string>>;
  setSelectedNodeIds: Dispatch<SetStateAction<string[]>>;
}

export interface GraphRuntimeRenderer {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  graphData: { links: FGLink[]; nodes: FGNode[] };
  graphDataRef: MutableRefObject<{ links: FGLink[]; nodes: FGNode[] }>;
  resetVersion: number;
  structureVersion: number;
}

export interface GraphRuntimeContextSelection {
  selection: GraphContextSelection;
  setSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  lastContainerContextMenuEventRef: MutableRefObject<number>;
  lastGraphContextEventRef: MutableRefObject<number>;
  rightClickFallbackTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  rightMouseDownRef: MutableRefObject<GraphMouseState | null>;
}

export interface GraphRuntimeRenderCaches {
  fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
  imageCacheVersion: number;
  invalidateImages(this: void): void;
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  spritesRef: MutableRefObject<Map<string, SpriteText>>;
}

export interface GraphRuntime {
  context: GraphRuntimeContextSelection;
  dataRef: MutableRefObject<IGraphData>;
  directionColorRef: MutableRefObject<string>;
  directionModeRef: MutableRefObject<DirectionMode>;
  edgeDecorationsRef: MutableRefObject<Record<string, EdgeDecorationPayload> | undefined>;
  favoritesRef: MutableRefObject<Set<string>>;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphAppearanceRef: MutableRefObject<GraphAppearance>;
  highlightVersion: number;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  lastClickRef: MutableRefObject<{ nodeId: string; time: number } | null>;
  nodeDecorationsRef: MutableRefObject<Record<string, NodeDecorationPayload> | undefined>;
  nodeSizeModeRef: MutableRefObject<NodeSizeMode>;
  renderer: GraphRuntimeRenderer;
  renderCaches: GraphRuntimeRenderCaches;
  selection: GraphRuntimeSelection;
  setHighlightVersion: Dispatch<SetStateAction<number>>;
  showLabelsRef: MutableRefObject<boolean>;
  themeRef: MutableRefObject<ThemeKind>;
  timelineActiveRef: MutableRefObject<boolean>;
}

export interface TimelineAlphaGraph {
  d3Alpha?: (value: number) => unknown;
}

export function createEmptyRuntimeGraphData(): { links: FGLink[]; nodes: FGNode[] } {
  return { links: [], nodes: [] };
}

export function incrementImageCacheVersion(previous: number): number {
  return previous + 1;
}

export function applyTimelineAlpha(graph: TimelineAlphaGraph | undefined, alpha: number = 0.05): void {
  if (!graph || typeof graph.d3Alpha !== 'function') {
    return;
  }

  graph.d3Alpha(alpha);
}

function getVisibleSelection(
  selectedNodeIds: readonly string[],
  nodes: readonly FGNode[],
): string[] {
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  return selectedNodeIds.filter((nodeId) => visibleNodeIds.has(nodeId));
}

export function useGraphRuntime({
  bidirectionalMode,
  appearance = DEFAULT_GRAPH_APPEARANCE,
  data,
  directionColor,
  directionMode,
  edgeDecorations,
  favorites,
  graphViewContributions,
  graphMode,
  graphResetVersion,
  nodeDecorations,
  nodeSizeMode,
  showLabels,
  theme,
  timelineActive,
}: GraphRuntimeOptions): GraphRuntime {
  const timelineActiveRef = useRef(timelineActive);
  timelineActiveRef.current = timelineActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const fg2dRef = useRef<FG2DMethods<FGNode, FGLink> | undefined>(undefined);
  const fg3dRef = useRef<FG3DMethods<FGNode, FGLink> | undefined>(undefined);
  const highlightedNodeRef = useRef<string | null>(null);
  const highlightedNeighborsRef = useRef<Set<string>>(new Set());
  const selectedNodesSetRef = useRef<Set<string>>(new Set());
  const themeRef = useRef(theme);
  const directionModeRef = useRef(directionMode);
  const directionColorRef = useRef(directionColor);
  const favoritesRef = useRef(favorites);
  const graphDataRef = useRef<{ links: FGLink[]; nodes: FGNode[] }>(createEmptyRuntimeGraphData());
  const resetVersionRef = useRef(graphResetVersion);
  const structureVersionRef = useRef(0);
  const dataRef = useRef(data);
  const nodeSizeModeRef = useRef(nodeSizeMode);
  const fileInfoCacheRef = useRef<Map<string, IFileInfo>>(new Map());
  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const lastGraphContextEventRef = useRef(0);
  const lastContainerContextMenuEventRef = useRef(0);
  const rightClickFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightMouseDownRef = useRef<GraphMouseState | null>(null);
  const graphCursorRef = useRef<GraphCursorStyle>('default');
  const graphAppearanceRef = useRef(appearance);
  const showLabelsRef = useRef(showLabels);
  const spritesRef = useRef<Map<string, SpriteText>>(new Map());
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const nodeDecorationsRef = useRef(nodeDecorations);
  const edgeDecorationsRef = useRef(edgeDecorations);

  graphAppearanceRef.current = appearance;
  themeRef.current = theme;
  directionModeRef.current = directionMode;
  directionColorRef.current = directionColor;
  favoritesRef.current = favorites;
  dataRef.current = data;
  nodeSizeModeRef.current = nodeSizeMode;
  showLabelsRef.current = showLabels;
  nodeDecorationsRef.current = nodeDecorations;
  edgeDecorationsRef.current = edgeDecorations;

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [contextSelection, setContextSelection] = useState<GraphContextSelection>(() =>
    makeBackgroundContextSelection(),
  );
  const [imageCacheVersion, setImageCacheVersion] = useState(0);
  const [highlightVersion, setHighlightVersion] = useState(0);

  function triggerImageRerender(): void {
    setImageCacheVersion(incrementImageCacheVersion);
  }

  const graphData = useMemo(() => {
    const resolvedGraphMode = graphMode ?? '2d';
    const desiredGraphData = buildGraphData({
      data,
      appearance,
      nodeSizeMode: nodeSizeModeRef.current,
      theme: themeRef.current,
      favorites,
      graphViewContributions,
      graphMode: resolvedGraphMode,
      bidirectionalMode,
      timelineActive,
      previousNodes: graphDataRef.current.nodes,
    });
    const initialGraph = graphDataRef.current.nodes.length === 0
      && graphDataRef.current.links.length === 0;
    const fullReset = resetVersionRef.current !== graphResetVersion;
    resetVersionRef.current = graphResetVersion;
    const reconciliation = initialGraph || fullReset
      ? { graphData: desiredGraphData, structureChanged: true }
      : reconcileRuntimeGraphData(graphDataRef.current, desiredGraphData);
    if (reconciliation.structureChanged) structureVersionRef.current += 1;
    const nextGraphData = reconciliation.graphData;
    graphDataRef.current = nextGraphData;
    return nextGraphData;
  }, [appearance, bidirectionalMode, data, favorites, graphMode, graphResetVersion, graphViewContributions, timelineActive]);

  useNodeDecorationIndicators({
    decorations: nodeDecorations ?? EMPTY_NODE_DECORATIONS,
    fg2dRef,
    graphMode: graphMode ?? '2d',
    graphNodes: graphData.nodes,
    meshesRef,
    spritesRef,
  });

  useEffect(() => {
    if (!timelineActive) return;
    const graph = as2DExtMethods(fg2dRef.current);
    if (!graph) return;
    requestAnimationFrame(() => {
      applyTimelineAlpha(graph);
    });
  }, [data, timelineActive]);

  useEffect(() => {
    const visibleSelectedNodes = getVisibleSelection(selectedNodes, graphData.nodes);
    if (visibleSelectedNodes.length === selectedNodes.length) {
      return;
    }

    selectedNodesSetRef.current = new Set(visibleSelectedNodes);
    setSelectedNodes(visibleSelectedNodes);
  }, [graphData, selectedNodes]);

  return {
    context: {
      selection: contextSelection,
      setSelection: setContextSelection,
      lastContainerContextMenuEventRef,
      lastGraphContextEventRef,
      rightClickFallbackTimerRef,
      rightMouseDownRef,
    },
    dataRef,
    directionColorRef,
    directionModeRef,
    edgeDecorationsRef,
    favoritesRef,
    graphCursorRef,
    graphAppearanceRef,
    highlightVersion,
    highlightedNeighborsRef,
    highlightedNodeRef,
    lastClickRef,
    nodeDecorationsRef,
    nodeSizeModeRef,
    renderer: {
      containerRef,
      fg2dRef,
      fg3dRef,
      graphData,
      graphDataRef,
      resetVersion: graphResetVersion,
      structureVersion: structureVersionRef.current,
    },
    renderCaches: {
      fileInfoCacheRef,
      imageCacheVersion,
      invalidateImages: triggerImageRerender,
      meshesRef,
      spritesRef,
    },
    selection: {
      selectedNodeIds: selectedNodes,
      selectedNodeIdsRef: selectedNodesSetRef,
      setSelectedNodeIds: setSelectedNodes,
    },
    setHighlightVersion,
    showLabelsRef,
    themeRef,
    timelineActiveRef,
  };
}
