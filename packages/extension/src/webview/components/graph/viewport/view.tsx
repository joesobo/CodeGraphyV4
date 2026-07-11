import type { ReactElement } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '../../ui/context/menu';
import { NodeTooltip } from '../../nodeTooltip/view';
import type { FGLink, FGNode } from '../model/build';
import { GraphAccessibilityOverlay } from './accessibilityLayer/overlay';
import {
  createMenuEntriesSignature,
  ViewportContextMenuItems,
} from './contextMenu/view';
import type { ViewportProps } from './contracts';
import {
  resolveViewportAccessibilityItems,
  resolveViewportHandlers,
} from './handlers';
import { ViewportMarqueeSelectionOverlay } from './overlays/marquee';
import {
  ViewportPluginBackground,
  ViewportPluginOverlay,
  ViewportPluginWorldOverlay,
} from './overlays/plugins';
import { MemoizedViewportSurface } from './surface/view';
import { createNodeTooltipProps } from './tooltip/props';
import { GraphInlineEdit } from '../inlineEdit/view';

export type { ViewportProps } from './contracts';

export function Viewport({
  accessibilityItems,
  canvasBackgroundColor,
  containerBackgroundColor,
  borderColor,
  containerRef,
  directionMode,
  graphMode,
  handleContextMenu,
  handleMenuAction,
  handleMouseDownCapture,
  handleMouseLeave,
  handleMouseMoveCapture,
  handleMouseUpCapture,
  handleEdgeContextMenu,
  handleNodeClick,
  handleNodeContextMenu,
  handleNodeHover,
  marqueeSelection,
  inlineEditPosition,
  menuEntries,
  surface2dProps,
  surface3dProps,
  tooltipData,
  onSurface3dError,
  pluginHost,
}: ViewportProps): ReactElement {
  const menuEntriesSignature = createMenuEntriesSignature(menuEntries);
  const resolvedAccessibilityItems = resolveViewportAccessibilityItems(accessibilityItems);
  const resolvedHandlers = resolveViewportHandlers({
    handleEdgeContextMenu,
    handleNodeClick,
    handleNodeContextMenu,
    handleNodeHover,
  });

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
            graphMode={graphMode}
            onSurface3dError={onSurface3dError}
            surface2dProps={surface2dProps}
            surface3dProps={surface3dProps}
          />
          <ViewportPluginWorldOverlay pluginHost={pluginHost} />
          <ViewportPluginOverlay pluginHost={pluginHost} />
          <ViewportMarqueeSelectionOverlay marqueeSelection={marqueeSelection} />
          <GraphInlineEdit position={inlineEditPosition ?? null} />
          <GraphAccessibilityOverlay
            accessibilityItems={resolvedAccessibilityItems}
            graphLinks={surface2dProps.sharedProps.graphData.links as FGLink[]}
            graphNodes={surface2dProps.sharedProps.graphData.nodes as FGNode[]}
            onEdgeContextMenu={resolvedHandlers.handleEdgeContextMenu}
            onNodeClick={resolvedHandlers.handleNodeClick}
            onNodeContextMenu={resolvedHandlers.handleNodeContextMenu}
            onNodeHover={resolvedHandlers.handleNodeHover}
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
