import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { GraphContextMenuAction, GraphContextSelection } from '../../../contextMenu/contracts';
import type { createGraphInteractionHandlers } from '../../../interactionRuntime/handlers';
import type { FGNode } from '../../../model/build';
import type { GraphCursorStyle } from '../../../support/dom';
import type { WebviewPluginHost } from '../../../../../pluginHost/manager';
import type { useGraphTooltip } from '../tooltip/hook';
import type { UseGraphStateResult } from '../state';

export type GraphInteractionHandlersRuntime = ReturnType<typeof createGraphInteractionHandlers>;

export interface UseGraphInteractionRuntimeOptions {
  dataRef: MutableRefObject<IGraphData>;
  depthMode: boolean;
  fileInfoCacheRef: UseGraphStateResult['fileInfoCacheRef'];
  graphContextSelection: GraphContextSelection;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphDataRef: UseGraphStateResult['graphDataRef'];
  graphViewContributions?: CoreGraphViewContributionSet;
  graphMode: '2d' | '3d';
  highlightedNeighborsRef: UseGraphStateResult['highlightedNeighborsRef'];
  highlightedNodeRef: UseGraphStateResult['highlightedNodeRef'];
  isMacPlatform: boolean;
  lastClickRef: UseGraphStateResult['lastClickRef'];
  lastContainerContextMenuEventRef: UseGraphStateResult['lastContainerContextMenuEventRef'];
  lastGraphContextEventRef: UseGraphStateResult['lastGraphContextEventRef'];
  openFilterPatternPrompt?: (patterns: string[]) => void;
  openLegendRulePrompt?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    UseGraphStateResult,
    | 'containerRef'
    | 'fg2dRef'
    | 'fg3dRef'
    | 'rightClickFallbackTimerRef'
    | 'rightMouseDownRef'
    | 'selectedNodesSetRef'
  >;
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setHighlightVersion: Dispatch<SetStateAction<number>>;
  setSelectedNodes: Dispatch<SetStateAction<string[]>>;
  timelineActive?: boolean;
}

export interface UseGraphInteractionRuntimeResult {
  contextMenuRuntime: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['contextMenuRuntime'];
  handleBackgroundRightClick: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleBackgroundRightClick'];
  handleContextMenu(this: void, event?: ReactMouseEvent<HTMLDivElement>): void;
  handleEngineStop(this: void): void;
  handleLinkRightClick: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleLinkRightClick'];
  handleMenuAction(this: void, action: GraphContextMenuAction): void;
  handleMouseDownCapture: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleMouseDownCapture'];
  handleMouseLeave(this: void): void;
  handleMouseMoveCapture: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleMouseMoveCapture'];
  handleMouseUpCapture: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleMouseUpCapture'];
  handleNodeContextMenuById: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleNodeContextMenuById'];
  handleNodeDrag(this: void, node: FGNode, translate: { x: number; y: number }): void;
  handleNodeHover(this: void, node: FGNode | null): void;
  handleNodeDragEnd(this: void, node: FGNode, translate?: { x: number; y: number }): void;
  handleNodeRightClick: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleNodeRightClick'];
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: GraphInteractionHandlersRuntime;
  marqueeSelection: import('../../../marqueeSelection/model').GraphMarqueeSelectionState | null;
  setTooltipData: ReturnType<typeof useGraphTooltip>['setTooltipData'];
  stopTooltipTracking: ReturnType<typeof useGraphTooltip>['stopTooltipTracking'];
  tooltipData: ReturnType<typeof useGraphTooltip>['tooltipData'];
  tooltipTimeoutRef: ReturnType<typeof useGraphTooltip>['tooltipTimeoutRef'];
}
