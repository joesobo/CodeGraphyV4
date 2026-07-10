import type { Ref } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { DirectionMode } from '../../../../shared/settings/modes';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type {
  GraphContextMenuActionInvocation,
  GraphContextMenuEntry,
} from '../contextMenu/contracts';
import type { GraphMarqueeSelectionState } from '../marqueeSelection/model';
import type { FGLink, FGNode } from '../model/build';
import type { Surface2dProps } from '../rendering/surface/view/twoDimensional';
import type { GraphTooltipState } from '../tooltip/model';
import type { GraphAccessibilityItems } from './accessibility';

export interface ViewportProps {
  accessibilityItems?: GraphAccessibilityItems;
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
  containerRef: Ref<HTMLDivElement>;
  directionMode: DirectionMode;
  handleContextMenu: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMenuAction: (this: void, invocation: GraphContextMenuActionInvocation) => void;
  handleMouseDownCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: (this: void) => void;
  handleMouseMoveCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseUpCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleEdgeContextMenu?: (this: void, link: FGLink, event: MouseEvent) => void;
  handleNodeClick?: (this: void, node: FGNode, event: MouseEvent) => void;
  handleNodeContextMenu?: (this: void, nodeId: string, event: MouseEvent) => void;
  handleNodeHover?: (this: void, node: FGNode | null) => void;
  marqueeSelection?: GraphMarqueeSelectionState | null;
  menuEntries: GraphContextMenuEntry[];
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  tooltipData: GraphTooltipState;
  pluginHost?: WebviewPluginHost;
}

export interface ResolvedViewportHandlers {
  handleEdgeContextMenu: NonNullable<ViewportProps['handleEdgeContextMenu']>;
  handleNodeClick: NonNullable<ViewportProps['handleNodeClick']>;
  handleNodeContextMenu: NonNullable<ViewportProps['handleNodeContextMenu']>;
  handleNodeHover: NonNullable<ViewportProps['handleNodeHover']>;
}
