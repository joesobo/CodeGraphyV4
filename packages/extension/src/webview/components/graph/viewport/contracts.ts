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
import type { Surface3dProps } from '../rendering/surface/view/threeDimensional';
import type { GraphTooltipState } from '../tooltip/model';
import type { GraphAccessibilityItems } from './accessibility';
import type { GraphInlineEditPosition } from '../inlineEdit/view';

export interface ViewportProps {
  accessibilityItems?: GraphAccessibilityItems;
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
  containerRef: Ref<HTMLDivElement>;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
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
  inlineEditPosition?: GraphInlineEditPosition | null;
  menuEntries: GraphContextMenuEntry[];
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
  tooltipData: GraphTooltipState;
  onSurface3dError?: (error: Error) => void;
  pluginHost?: WebviewPluginHost;
}

export interface ResolvedViewportHandlers {
  handleEdgeContextMenu: NonNullable<ViewportProps['handleEdgeContextMenu']>;
  handleNodeClick: NonNullable<ViewportProps['handleNodeClick']>;
  handleNodeContextMenu: NonNullable<ViewportProps['handleNodeContextMenu']>;
  handleNodeHover: NonNullable<ViewportProps['handleNodeHover']>;
}
