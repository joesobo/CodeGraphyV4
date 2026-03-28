import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type {
  BidirectionalEdgeMode,
  DirectionMode,
  EdgeDecorationPayload,
  IFileInfo,
  IGraphData,
  NodeSizeMode,
  NodeDecorationPayload,
} from '../../../../shared/contracts';
import type {
  GraphContextSelection,
} from '../../graphContextMenu/types';
import { makeBackgroundContextSelection } from '../../graphContextMenu/selection';
import {
  buildGraphData,
  type FGLink,
  type FGNode,
} from '../../graphModel';
import {
  as2DExtMethods,
} from '../../graphSupport/types';
import type { GraphCursorStyle } from '../../graphSupport/dom';
import type { ThemeKind } from '../../../useTheme';

export interface GraphMouseState {
  ctrlKey: boolean;
  moved: boolean;
  x: number;
  y: number;
}

export interface UseGraphStateOptions {
  bidirectionalMode: BidirectionalEdgeMode;
  data: IGraphData;
  directionColor: string;
  directionMode: DirectionMode;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  favorites: Set<string>;
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

export function useGraphState({
  bidirectionalMode,
  data,
  directionColor,
  directionMode,
  edgeDecorations,
  favorites,
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
  const showLabelsRef = useRef(showLabels);
  const spritesRef = useRef<Map<string, SpriteText>>(new Map());
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const nodeDecorationsRef = useRef(nodeDecorations);
  const edgeDecorationsRef = useRef(edgeDecorations);

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
  }, [bidirectionalMode, data]);

  useEffect(() => {
    if (!timelineActive) return;
    const graph = as2DExtMethods(fg2dRef.current);
    if (!graph) return;
    requestAnimationFrame(() => {
      applyTimelineAlpha(graph);
    });
  }, [data, timelineActive]);

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
