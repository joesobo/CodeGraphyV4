import type { MutableRefObject } from 'react';
import type {
  ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { IFileInfo, IGraphData } from '../../../../shared/contracts';
import type { GraphContextSelection } from '../../graphContextMenu/types';
import {
  type GraphInteractionEffect,
  type GraphLastClickState,
} from '../../graphInteraction/model';
import type { FGLink, FGNode } from '../../graphModel';
import { applyCursorToGraphSurface, type GraphCursorStyle } from '../../graphSupport/dom';
import { createClickHandlers } from './click';
import { createContextMenuHandlers } from './contextMenu';
import { createEffectHandlers } from './effects';
import { createSelectionHandlers } from './selection';
import { createViewHandlers } from './view';

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
    effects: GraphInteractionEffect[],
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
  const setGraphCursor = (cursor: GraphCursorStyle): void => {
    dependencies.graphCursorRef.current = cursor;
    const container = dependencies.containerRef.current;
    if (!container) return;
    applyCursorToGraphSurface(container, cursor);
  };

  const selectionHandlers = createSelectionHandlers(dependencies);
  const contextMenuHandlers = createContextMenuHandlers(
    dependencies,
    selectionHandlers.setSelection,
  );
  const viewHandlers = createViewHandlers(dependencies);
  const effectHandlers = createEffectHandlers(dependencies, {
    clearSelection: selectionHandlers.clearSelection,
    focusNodeById: viewHandlers.focusNodeById,
    openBackgroundContextMenu: contextMenuHandlers.openBackgroundContextMenu,
    openEdgeContextMenu: contextMenuHandlers.openEdgeContextMenu,
    openNodeContextMenu: contextMenuHandlers.openNodeContextMenu,
    selectOnlyNode: selectionHandlers.selectOnlyNode,
    setSelection: selectionHandlers.setSelection,
  });
  const clickHandlers = createClickHandlers(dependencies, {
    applyGraphInteractionEffects: effectHandlers.applyGraphInteractionEffects,
    setGraphCursor,
  });

  return {
    applyGraphInteractionEffects: effectHandlers.applyGraphInteractionEffects,
    clearSelection: selectionHandlers.clearSelection,
    fitView: viewHandlers.fitView,
    focusNodeById: viewHandlers.focusNodeById,
    handleBackgroundClick: clickHandlers.handleBackgroundClick,
    handleLinkClick: clickHandlers.handleLinkClick,
    handleNodeClick: clickHandlers.handleNodeClick,
    openBackgroundContextMenu: contextMenuHandlers.openBackgroundContextMenu,
    openEdgeContextMenu: contextMenuHandlers.openEdgeContextMenu,
    openNodeContextMenu: contextMenuHandlers.openNodeContextMenu,
    previewNode: effectHandlers.previewNode,
    requestNodeOpenById: effectHandlers.requestNodeOpenById,
    selectOnlyNode: selectionHandlers.selectOnlyNode,
    sendGraphInteraction: effectHandlers.sendGraphInteraction,
    setGraphCursor,
    setHighlight: selectionHandlers.setHighlight,
    setSelection: selectionHandlers.setSelection,
    updateAccessCount: viewHandlers.updateAccessCount,
    zoom2d: viewHandlers.zoom2d,
  };
}
