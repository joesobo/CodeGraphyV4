import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../../shared/settings/groups';
import type { GraphContextMenuActionInvocation, GraphContextSelection } from '../../../contextMenu/contracts';
import type { createGraphInteractionHandlers } from '../../../interactionRuntime/handlers';
import type { FGNode } from '../../../model/build';
import type { GraphCursorStyle } from '../../../support/dom';
import type { WebviewPluginHost } from '../../../../../pluginHost/manager';
import type { useGraphTooltip } from '../tooltip/hook';
import type { GraphRuntime } from '../state';

export type GraphInteractionHandlersRuntime = ReturnType<typeof createGraphInteractionHandlers>;

export interface UseGraphInteractionRuntimeOptions {
  dataRef: MutableRefObject<IGraphData>;
  depthMode: boolean;
  fileInfoCacheRef: GraphRuntime['renderCaches']['fileInfoCacheRef'];
  graphContextSelection: GraphContextSelection;
  graphCursorRef: MutableRefObject<GraphCursorStyle>;
  graphDataRef: GraphRuntime['renderer']['graphDataRef'];
  graphViewContributions?: ExtensionGraphViewContributionSet;
  highlightedNeighborsRef: GraphRuntime['highlightedNeighborsRef'];
  highlightedNodeRef: GraphRuntime['highlightedNodeRef'];
  isMacPlatform: boolean;
  lastClickRef: GraphRuntime['lastClickRef'];
  lastContainerContextMenuEventRef: GraphRuntime['context']['lastContainerContextMenuEventRef'];
  lastGraphContextEventRef: GraphRuntime['context']['lastGraphContextEventRef'];
  legends?: readonly IGroup[];
  openFilterPatternPrompt?: (patterns: string[]) => void;
  openLegendRulePrompt?: (rule: { pattern: string; color: string; target: 'node' | 'edge' }) => void;
  pluginHost?: WebviewPluginHost;
  refs: {
    containerRef: GraphRuntime['renderer']['containerRef'];
    fg2dRef: GraphRuntime['renderer']['fg2dRef'];
    rightClickFallbackTimerRef: GraphRuntime['context']['rightClickFallbackTimerRef'];
    rightMouseDownRef: GraphRuntime['context']['rightMouseDownRef'];
    selectedNodesSetRef: GraphRuntime['selection']['selectedNodeIdsRef'];
  };
  setContextSelection: Dispatch<SetStateAction<GraphContextSelection>>;
  setSelectedNodes: Dispatch<SetStateAction<string[]>>;
}

export interface UseGraphInteractionRuntimeResult {
  contextMenuRuntime: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['contextMenuRuntime'];
  handleBackgroundRightClick: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleBackgroundRightClick'];
  handleContextMenu(this: void, event?: ReactMouseEvent<HTMLDivElement>): void;
  handleEngineStop(this: void): void;
  handleLinkRightClick: import('../../../contextMenuOpening/runtime').GraphContextMenuOpeningRuntime['handleLinkRightClick'];
  handleMenuAction(this: void, invocation: GraphContextMenuActionInvocation): void;
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
