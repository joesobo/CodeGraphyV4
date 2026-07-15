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
import type { OwnedGraph2dControls } from '../../rendering/surface/owned2d/contracts';
import type { GraphCursorStyle } from '../../support/dom';
import type { ThemeKind } from '../../../../theme/useTheme';

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
  directionMode: DirectionMode;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
  favorites: Set<string>;
  graphViewContributions?: CoreGraphViewContributionSet;
  nodeDecorations?: Record<string, NodeDecorationPayload>;
  nodeSizeMode: NodeSizeMode;
  showLabels: boolean;
  theme: ThemeKind;
}

interface GraphRuntimeSelection {
  selectedNodeIds: string[];
  selectedNodeIdsRef: MutableRefObject<Set<string>>;
  setSelectedNodeIds: Dispatch<SetStateAction<string[]>>;
}

export interface GraphRuntimeRenderer {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
  graphData: { links: FGLink[]; nodes: FGNode[] };
  graphDataRef: MutableRefObject<{ links: FGLink[]; nodes: FGNode[] }>;
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
  invalidateImages(this: void): void;
}

export interface GraphRuntime {
  context: GraphRuntimeContextSelection;
  dataRef: MutableRefObject<IGraphData>;
  directionModeRef: MutableRefObject<DirectionMode>;
  edgeDecorationsRef: MutableRefObject<Record<string, EdgeDecorationPayload> | undefined>;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphAppearanceRef: MutableRefObject<GraphAppearance>;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  lastClickRef: MutableRefObject<{ nodeId: string; time: number } | null>;
  nodeDecorationsRef: MutableRefObject<Record<string, NodeDecorationPayload> | undefined>;
  renderer: GraphRuntimeRenderer;
  renderCaches: GraphRuntimeRenderCaches;
  selection: GraphRuntimeSelection;
  showLabelsRef: MutableRefObject<boolean>;
  themeRef: MutableRefObject<ThemeKind>;
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
  directionMode,
  edgeDecorations,
  favorites,
  graphViewContributions,
  nodeDecorations,
  nodeSizeMode,
  showLabels,
  theme,
}: GraphRuntimeOptions): GraphRuntime {
  const containerRef = useRef<HTMLDivElement>(null);
  const fg2dRef = useRef<OwnedGraph2dControls | undefined>(undefined);
  const highlightedNodeRef = useRef<string | null>(null);
  const highlightedNeighborsRef = useRef<Set<string>>(new Set());
  const selectedNodesSetRef = useRef<Set<string>>(new Set());
  const themeRef = useRef(theme);
  const directionModeRef = useRef(directionMode);
  const graphDataRef = useRef<{ links: FGLink[]; nodes: FGNode[] }>({ links: [], nodes: [] });
  const dataRef = useRef(data);
  const fileInfoCacheRef = useRef<Map<string, IFileInfo>>(new Map());
  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const lastGraphContextEventRef = useRef(0);
  const lastContainerContextMenuEventRef = useRef(0);
  const rightClickFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightMouseDownRef = useRef<GraphMouseState | null>(null);
  const graphCursorRef = useRef<GraphCursorStyle>('default');
  const graphAppearanceRef = useRef(appearance);
  const showLabelsRef = useRef(showLabels);
  const nodeDecorationsRef = useRef(nodeDecorations);
  const edgeDecorationsRef = useRef(edgeDecorations);

  graphAppearanceRef.current = appearance;
  themeRef.current = theme;
  directionModeRef.current = directionMode;
  dataRef.current = data;
  showLabelsRef.current = showLabels;
  nodeDecorationsRef.current = nodeDecorations;
  edgeDecorationsRef.current = edgeDecorations;

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [contextSelection, setContextSelection] = useState<GraphContextSelection>(() =>
    makeBackgroundContextSelection(),
  );
  const [, setImageCacheVersion] = useState(0);

  function triggerImageRerender(): void {
    setImageCacheVersion(previous => previous + 1);
  }

  const graphData = useMemo(() => {
    const nextGraphData = buildGraphData({
      data,
      appearance,
      nodeSizeMode,
      theme: themeRef.current,
      favorites,
      graphViewContributions,
      bidirectionalMode,
      previousNodes: graphDataRef.current.nodes,
    });

    graphDataRef.current = nextGraphData;
    return nextGraphData;
  }, [appearance, bidirectionalMode, data, favorites, graphViewContributions, nodeSizeMode]);

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
    directionModeRef,
    edgeDecorationsRef,
    graphCursorRef,
    graphAppearanceRef,
    highlightedNeighborsRef,
    highlightedNodeRef,
    lastClickRef,
    nodeDecorationsRef,
    renderer: {
      containerRef,
      fg2dRef,
      graphData,
      graphDataRef,
    },
    renderCaches: {
      fileInfoCacheRef,
      invalidateImages: triggerImageRerender,
    },
    selection: {
      selectedNodeIds: selectedNodes,
      selectedNodeIdsRef: selectedNodesSetRef,
      setSelectedNodeIds: setSelectedNodes,
    },
    showLabelsRef,
    themeRef,
  };
}
