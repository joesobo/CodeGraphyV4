import type { MutableRefObject } from 'react';
import type {
  ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { IFileInfo, IGraphData } from '../../../shared/types';
import { postMessage } from '../../lib/vscodeApi';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
  type GraphContextSelection,
} from '../graphContextMenu';
import { applyInteractionEffects } from './effects/interaction';
import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
  getNodeContextMenuSelection,
  type GraphLastClickState,
} from '../graphInteractionModel';
import type { FGLink, FGNode } from '../graphModel';
import {
  applyCursorToGraphSurface,
  resolveEdgeActionTargetId,
  resolveLinkEndpointId,
  type GraphCursorStyle,
} from '../graphSupport';

const NODE_DOUBLE_CLICK_THRESHOLD_MS = 450;

export interface GraphInteractionHandlersDependencies {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  dataRef: MutableRefObject<IGraphData>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphMode: '2d' | '3d';
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  isMacPlatform: boolean;
  lastClickRef: MutableRefObject<GraphLastClickState | null>;
  lastGraphContextEventRef: MutableRefObject<number>;
  selectedNodesSetRef: MutableRefObject<Set<string>>;
  setContextSelection(selection: GraphContextSelection): void;
  setHighlightVersion(updater: (previous: number) => number): void;
  setSelectedNodes(nodeIds: string[]): void;
}

export interface GraphInteractionHandlers {
  applyGraphInteractionEffects: (
    this: void,
    effects: ReturnType<typeof getNodeClickCommand>['effects'],
    options?: { event?: MouseEvent; link?: FGLink },
  ) => void;
  clearSelection: (this: void) => void;
  fitView: (this: void) => void;
  focusNodeById: (this: void, nodeId: string) => void;
  handleBackgroundClick: (this: void, event?: MouseEvent) => void;
  handleLinkClick: (this: void, link: FGLink, event: MouseEvent) => void;
  handleNodeClick: (this: void, node: FGNode, event: MouseEvent) => void;
  openBackgroundContextMenu: (this: void, event: MouseEvent) => void;
  openEdgeContextMenu: (this: void, link: FGLink, event: MouseEvent) => void;
  openNodeContextMenu: (this: void, nodeId: string, event: MouseEvent) => void;
  previewNode: (this: void, nodeId: string) => void;
  requestNodeOpenById: (this: void, nodeId: string) => void;
  selectOnlyNode: (this: void, nodeId: string) => void;
  sendGraphInteraction: (this: void, event: string, eventData: unknown) => void;
  setGraphCursor: (this: void, cursor: GraphCursorStyle) => void;
  setHighlight: (this: void, nodeId: string | null) => void;
  setSelection: (this: void, nodeIds: string[]) => void;
  updateAccessCount: (this: void, nodeId: string, accessCount: number) => void;
  zoom2d: (this: void, factor: number) => void;
}

export function createGraphInteractionHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): GraphInteractionHandlers {
  const openContextMenuFromGraphCallback = (event?: MouseEvent): void => {
    const container = dependencies.containerRef.current;
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
  };

  const sendGraphInteraction = (event: string, eventData: unknown): void => {
    postMessage({ type: 'GRAPH_INTERACTION', payload: { event, data: eventData } });
  };

  const setGraphCursor = (cursor: GraphCursorStyle): void => {
    dependencies.graphCursorRef.current = cursor;
    const container = dependencies.containerRef.current;
    if (!container) return;
    applyCursorToGraphSurface(container, cursor);
  };

  const setSelection = (nodeIds: string[]): void => {
    dependencies.selectedNodesSetRef.current = new Set(nodeIds);
    dependencies.setSelectedNodes(nodeIds);
  };

  const setHighlight = (nodeId: string | null): void => {
    dependencies.highlightedNodeRef.current = nodeId;

    if (nodeId) {
      const neighbors = new Set<string>();
      for (const link of dependencies.graphDataRef.current.links) {
        const sourceId =
          typeof link.source === 'string' ? link.source : (link.source as FGNode | undefined)?.id;
        const targetId =
          typeof link.target === 'string' ? link.target : (link.target as FGNode | undefined)?.id;

        if (sourceId === nodeId && targetId) neighbors.add(targetId);
        if (targetId === nodeId && sourceId) neighbors.add(sourceId);
      }
      dependencies.highlightedNeighborsRef.current = neighbors;
    } else {
      dependencies.highlightedNeighborsRef.current = new Set();
    }

    if (dependencies.graphMode === '3d') {
      dependencies.setHighlightVersion(previous => previous + 1);
    }
  };

  const selectOnlyNode = (nodeId: string): void => {
    setHighlight(nodeId);
    setSelection([nodeId]);
  };

  const openNodeContextMenu = (nodeId: string, event: MouseEvent): void => {
    const selection = getNodeContextMenuSelection(
      nodeId,
      dependencies.selectedNodesSetRef.current,
    );

    if (selection.shouldUpdateSelection) {
      setSelection(selection.nodeIds);
    }

    dependencies.setContextSelection(
      makeNodeContextSelection(nodeId, new Set(selection.nodeIds)),
    );
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  };

  const openEdgeContextMenu = (link: FGLink, event: MouseEvent): void => {
    const sourceId =
      resolveLinkEndpointId(link.from) ??
      resolveLinkEndpointId((link as { source?: unknown }).source);
    const targetId =
      resolveLinkEndpointId(link.to) ??
      resolveLinkEndpointId((link as { target?: unknown }).target);
    if (!sourceId || !targetId) return;

    const edgeId = resolveEdgeActionTargetId(
      link.id,
      sourceId,
      targetId,
      dependencies.dataRef.current.edges,
    );

    dependencies.setContextSelection(
      makeEdgeContextSelection(edgeId, sourceId, targetId),
    );
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  };

  const openBackgroundContextMenu = (event: MouseEvent): void => {
    dependencies.setContextSelection(makeBackgroundContextSelection());
    dependencies.lastGraphContextEventRef.current = Date.now();
    openContextMenuFromGraphCallback(event);
  };

  const focusNodeById = (nodeId: string): void => {
    const node = dependencies.graphDataRef.current.nodes.find(
      candidate => candidate.id === nodeId,
    );
    if (!node) return;

    if (dependencies.graphMode === '2d') {
      dependencies.fg2dRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 300);
      dependencies.fg2dRef.current?.zoom(1.5, 300);
      return;
    }

    dependencies.fg3dRef.current?.zoomToFit(
      300,
      20,
      candidate => (candidate as FGNode).id === nodeId,
    );
  };

  const requestNodeOpenById = (nodeId: string): void => {
    dependencies.fileInfoCacheRef.current.delete(nodeId);
    postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
  };

  const fitView = (): void => {
    if (dependencies.graphMode === '2d') {
      dependencies.fg2dRef.current?.zoomToFit(300, 20);
      return;
    }

    dependencies.fg3dRef.current?.zoomToFit(300, 20);
  };

  const zoom2d = (factor: number): void => {
    const forceGraph = dependencies.fg2dRef.current;
    if (!forceGraph) return;

    const currentZoom = forceGraph.zoom();
    forceGraph.zoom(currentZoom * factor, 150);
  };

  const clearSelection = (): void => {
    setHighlight(null);
    setSelection([]);
  };

  const previewNode = (nodeId: string): void => {
    postMessage({ type: 'NODE_SELECTED', payload: { nodeId } });
  };

  const updateAccessCount = (nodeId: string, accessCount: number): void => {
    const node = dependencies.dataRef.current.nodes.find(candidate => candidate.id === nodeId);
    if (node) {
      node.accessCount = accessCount;
    }
  };

  const applyGraphInteractionEffects = (
    effects: ReturnType<typeof getNodeClickCommand>['effects'],
    options: { event?: MouseEvent; link?: FGLink } = {},
  ): void => {
    applyInteractionEffects(
      effects,
      {
        clearSelection,
        focusNode: focusNodeById,
        openBackgroundContextMenu,
        openEdgeContextMenu,
        openNode: requestNodeOpenById,
        openNodeContextMenu,
        previewNode,
        selectOnlyNode,
        sendInteraction: sendGraphInteraction,
        setSelection,
      },
      options,
    );
  };

  const handleNodeClick = (node: FGNode, event: MouseEvent): void => {
    const command = getNodeClickCommand({
      nodeId: node.id,
      label: node.label,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
      isMacPlatform: dependencies.isMacPlatform,
      selectedNodeIds: dependencies.selectedNodesSetRef.current,
      lastClick: dependencies.lastClickRef.current,
      now: Date.now(),
      doubleClickThresholdMs: NODE_DOUBLE_CLICK_THRESHOLD_MS,
    });

    dependencies.lastClickRef.current = command.nextLastClick;
    applyGraphInteractionEffects(command.effects, { event });
  };

  const handleBackgroundClick = (event?: MouseEvent): void => {
    setGraphCursor('default');

    if (!event) {
      applyGraphInteractionEffects(
        getBackgroundClickCommand({
          ctrlKey: false,
          isMacPlatform: false,
        }),
      );
      return;
    }

    applyGraphInteractionEffects(
      getBackgroundClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform: dependencies.isMacPlatform,
      }),
      { event },
    );
  };

  const handleLinkClick = (link: FGLink, event: MouseEvent): void => {
    applyGraphInteractionEffects(
      getLinkClickCommand({
        ctrlKey: event.ctrlKey,
        isMacPlatform: dependencies.isMacPlatform,
      }),
      { event, link },
    );
  };

  return {
    applyGraphInteractionEffects,
    clearSelection,
    fitView,
    focusNodeById,
    handleBackgroundClick,
    handleLinkClick,
    handleNodeClick,
    openBackgroundContextMenu,
    openEdgeContextMenu,
    openNodeContextMenu,
    previewNode,
    requestNodeOpenById,
    selectOnlyNode,
    sendGraphInteraction,
    setGraphCursor,
    setHighlight,
    setSelection,
    updateAccessCount,
    zoom2d,
  };
}
