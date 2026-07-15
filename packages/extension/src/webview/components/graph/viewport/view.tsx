import type { ReactElement } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '../../ui/context/menu';
import { NodeTooltip } from '../../nodeTooltip/view';
import { GraphAccessibilityOverlay } from './accessibilityLayer/overlay';
import {
  createMenuEntriesSignature,
  ViewportContextMenuItems,
} from './contextMenu/view';
import type { GraphAccessibilityItems } from './accessibility';
import type { ViewportProps } from './contracts';
import { ViewportMarqueeSelectionOverlay } from './overlays/marquee';
import {
  ViewportPluginBackground,
  ViewportPluginOverlay,
  ViewportPluginWorldOverlay,
} from './overlays/plugins';
import { MemoizedViewportSurface } from './surface/view';
import { createNodeTooltipProps } from './tooltip/props';

export type { ViewportProps } from './contracts';

const EMPTY_ACCESSIBILITY_ITEMS: GraphAccessibilityItems = { nodes: [], edges: [] };
const ignoreGraphInteraction = () => undefined;

export function Viewport({
  accessibilityItems = EMPTY_ACCESSIBILITY_ITEMS,
  canvasBackgroundColor,
  containerBackgroundColor,
  borderColor,
  containerRef,
  directionMode,
  handleContextMenu,
  handleMenuAction,
  handleMouseDownCapture,
  handleMouseLeave,
  handleMouseMoveCapture,
  handleMouseUpCapture,
  handleEdgeContextMenu = ignoreGraphInteraction,
  handleNodeClick = ignoreGraphInteraction,
  handleNodeContextMenu = ignoreGraphInteraction,
  handleNodeHover = ignoreGraphInteraction,
  marqueeSelection,
  menuEntries,
  surface2dProps,
  tooltipData,
  pluginHost,
}: ViewportProps): ReactElement {
  const menuEntriesSignature = createMenuEntriesSignature(menuEntries);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          data-codegraphy-surface="graph-stage"
          onContextMenu={handleContextMenu}
          onMouseLeave={handleMouseLeave}
          onMouseDownCapture={handleMouseDownCapture}
          onMouseMoveCapture={handleMouseMoveCapture}
          onMouseUpCapture={handleMouseUpCapture}
          className="graph-container absolute inset-2 overflow-hidden rounded-md outline-none focus:outline-none"
          style={{ backgroundColor: containerBackgroundColor, borderWidth: 0, borderStyle: 'solid', borderColor, cursor: 'default' }}
          aria-label="Graph Stage"
          tabIndex={0}
        >
          <ViewportPluginBackground pluginHost={pluginHost} />
          <MemoizedViewportSurface
            canvasBackgroundColor={canvasBackgroundColor}
            directionMode={directionMode}
            surface2dProps={surface2dProps}
          />
          <ViewportPluginWorldOverlay pluginHost={pluginHost} />
          <ViewportPluginOverlay pluginHost={pluginHost} />
          <ViewportMarqueeSelectionOverlay marqueeSelection={marqueeSelection} />
          <GraphAccessibilityOverlay
            accessibilityItems={accessibilityItems}
            graphLinks={surface2dProps.sharedProps.graphData.links}
            graphNodes={surface2dProps.sharedProps.graphData.nodes}
            onEdgeContextMenu={handleEdgeContextMenu}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeHover={handleNodeHover}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent key={menuEntriesSignature} data-menu-entries-signature={menuEntriesSignature} className="w-64">
        <ViewportContextMenuItems
          handleMenuAction={handleMenuAction}
          menuEntries={menuEntries}
        />
      </ContextMenuContent>

      <NodeTooltip {...createNodeTooltipProps({ tooltipData, pluginHost })} />
    </ContextMenu>
  );
}
