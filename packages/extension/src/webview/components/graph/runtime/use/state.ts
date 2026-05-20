import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type { IFileInfo } from '../../../../../shared/files/info';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from '../../../../../shared/settings/modes';
import type {
  GraphContextSelection,
} from '../../contextMenu/contracts';
import { makeBackgroundContextSelection } from '../../contextMenu/selection';
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

export interface GraphMouseState {
  ctrlKey: boolean;
  moved: boolean;
  x: number;
  y: number;
}

export interface UseGraphStateOptions {
  bidirectionalMode: BidirectionalEdgeMode;
  appearance?: GraphAppearance;
  data: IGraphData;
  directionColor: string;
  directionMode: DirectionMode;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  favorites: Set<string>;
  graphViewContributions?: CoreGraphViewContributionSet;
  graphMode?: '2d' | '3d';
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  nodeSizeMode: NodeSizeMode;
  showLabels: boolean;
  theme: ThemeKind;
  timelineActive: boolean;
}

export interface UseGraphStateResult {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  contextSelection: GraphContextSelection;
  dataRef: MutableRefObject<IGraphData>;
  directionColorRef: MutableRefObject<string>;
  directionModeRef: MutableRefObject<DirectionMode>;
  edgeDecorationsRef: MutableRefObject<Record<string, EdgeDecorationPayload> | undefined>;
  favoritesRef: MutableRefObject<Set<string>>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphAppearanceRef: MutableRefObject<GraphAppearance>;
  graphData: { links: FGLink[]; nodes: FGNode[] };
  graphDataRef: MutableRefObject<{ links: FGLink[]; nodes: FGNode[] }>;
  imageCacheVersion: number;
  highlightVersion: number;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  lastClickRef: MutableRefObject<{ nodeId: string; time: number } | null>;
  lastContainerContextMenuEventRef: MutableRefObject<number>;
  lastGraphContextEventRef: MutableRefObject<number>;
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  nodeDecorationsRef: MutableRefObject<Record<string, NodeDecorationPayload> | undefined>;
  nodeSizeModeRef: MutableRefObject<NodeSizeMode>;
  rightClickFallbackTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  rightMouseDownRef: MutableRefObject<GraphMouseState | null>;
  selectedNodes: string[];
  selectedNodesSetRef: MutableRefObject<Set<string>>;
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setHighlightVersion: Dispatch<SetStateAction<number>>;
  setSelectedNodes: Dispatch<SetStateAction<string[]>>;
  showLabelsRef: MutableRefObject<boolean>;
  spritesRef: MutableRefObject<Map<string, SpriteText>>;
  themeRef: MutableRefObject<ThemeKind>;
  timelineActiveRef: MutableRefObject<boolean>;
  triggerImageRerender(this: void): void;
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

export function useGraphState({
  bidirectionalMode,
  appearance = DEFAULT_GRAPH_APPEARANCE,
  data,
  directionColor,
  directionMode,
  edgeDecorations,
  favorites,
  graphViewContributions,
  graphMode,
  nodeDecorations,
  nodeSizeMode,
  showLabels,
  theme,
  timelineActive,
}: UseGraphStateOptions): UseGraphStateResult {
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
    const nextGraphData = buildGraphData({
      data,
      appearance,
      nodeSizeMode: nodeSizeModeRef.current,
      theme: themeRef.current,
      favorites: favoritesRef.current,
      graphViewContributions,
      graphMode: resolvedGraphMode,
      bidirectionalMode,
      timelineActive,
      previousNodes: graphDataRef.current.nodes,
    });

    graphDataRef.current = nextGraphData;
    return nextGraphData;
  }, [appearance, bidirectionalMode, data, graphMode, graphViewContributions, timelineActive]);

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
    containerRef,
    contextSelection,
    dataRef,
    directionColorRef,
    directionModeRef,
    edgeDecorationsRef,
    favoritesRef,
    fg2dRef,
    fg3dRef,
    fileInfoCacheRef,
    graphCursorRef,
    graphAppearanceRef,
    graphData,
    graphDataRef,
    imageCacheVersion,
    highlightVersion,
    highlightedNeighborsRef,
    highlightedNodeRef,
    lastClickRef,
    lastContainerContextMenuEventRef,
    lastGraphContextEventRef,
    meshesRef,
    nodeDecorationsRef,
    nodeSizeModeRef,
    rightClickFallbackTimerRef,
    rightMouseDownRef,
    selectedNodes,
    selectedNodesSetRef,
    setContextSelection,
    setHighlightVersion,
    setSelectedNodes,
    showLabelsRef,
    spritesRef,
    themeRef,
    timelineActiveRef,
    triggerImageRerender,
  };
}
