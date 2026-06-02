import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactElement, Ref } from 'react';
import type { DirectionMode } from '../../../../shared/settings/modes';
import type { GraphMarqueeSelectionState } from '../marqueeSelection/model';
import type { GraphTooltipState } from '../tooltip/model';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../../ui/context/menu';
import { NodeTooltip } from '../../nodeTooltip/view';
import type {
  GraphContextMenuActionInvocation,
  GraphContextMenuEntry,
} from '../contextMenu/contracts';
import {
  Surface2d,
  type Surface2dProps,
} from '../rendering/surface/view/twoDimensional';
import {
  DeferredSurface3d,
  type Surface3dProps,
} from '../rendering/surface/view/threeDimensional';
import { SurfaceFallbackBoundary } from '../rendering/surface/view/fallbackBoundary';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { SlotHost } from '../../../pluginHost/slotHost/view';
import type { GraphAccessibilityItems } from './accessibility';
import type { FGNode } from '../model/build';

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
  handleNodeClick?: (this: void, node: FGNode, event: MouseEvent) => void;
  handleNodeHover?: (this: void, node: FGNode | null) => void;
  marqueeSelection?: GraphMarqueeSelectionState | null;
  menuEntries: GraphContextMenuEntry[];
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
  tooltipData: GraphTooltipState;
  onSurface3dError?: (error: Error) => void;
  pluginHost?: WebviewPluginHost;
}

interface ViewportSurfaceProps {
  canvasBackgroundColor: string;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
  onSurface3dError?: (error: Error) => void;
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
}

function ViewportSurface({
  canvasBackgroundColor,
  directionMode,
  graphMode,
  onSurface3dError,
  surface2dProps,
  surface3dProps,
}: ViewportSurfaceProps): ReactElement {
  if (graphMode === '2d') {
    return (
      <Surface2d
        {...surface2dProps}
        backgroundColor={canvasBackgroundColor}
        directionMode={directionMode}
      />
    );
  }

  const fallback = (
    <Surface2d
      {...surface2dProps}
      backgroundColor={canvasBackgroundColor}
      directionMode={directionMode}
    />
  );

  return (
    <SurfaceFallbackBoundary
      resetKey={graphMode}
      onError={onSurface3dError}
      fallback={fallback}
    >
      <DeferredSurface3d
        {...surface3dProps}
        backgroundColor={canvasBackgroundColor}
        directionMode={directionMode}
        fallback={fallback}
      />
    </SurfaceFallbackBoundary>
  );
}

function ViewportPluginOverlay({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <>
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.stage.worldOverlay"
        data-testid="graph-world-overlay-slot"
        className="absolute inset-0 z-10 pointer-events-none"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="graph-overlay"
        data-testid="graph-overlay-slot"
        className="absolute inset-0 z-10 pointer-events-none"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.stage.viewportOverlay"
        data-testid="graph-viewport-overlay-slot"
        className="absolute inset-0 z-30 pointer-events-none"
      />
    </>
  ) : null;
}

function ViewportMarqueeSelectionOverlay({
  marqueeSelection,
}: Pick<ViewportProps, 'marqueeSelection'>): ReactElement | null {
  return marqueeSelection ? (
    <div
      data-testid="graph-marquee-selection"
      className="pointer-events-none absolute z-20 rounded-sm border border-dashed border-[var(--cg-focus-border)] bg-[var(--cg-graph-marquee-background)]"
      style={{
        left: marqueeSelection.bounds.left,
        top: marqueeSelection.bounds.top,
        width: marqueeSelection.bounds.width,
        height: marqueeSelection.bounds.height,
      }}
    />
  ) : null;
}

function ViewportContextMenuItems({
  handleMenuAction,
  menuEntries,
}: Pick<ViewportProps, 'handleMenuAction' | 'menuEntries'>): ReactElement {
  return (
    <>
      {menuEntries.map(entry => {
        if (entry.kind === 'separator') {
          return <ContextMenuSeparator key={entry.id} />;
        }

        return (
          <ContextMenuItem
            key={entry.id}
            className={entry.destructive ? 'text-[var(--cg-error-foreground)] focus:text-[var(--cg-error-foreground)]' : undefined}
            disabled={entry.disabled}
            onClick={() => {
              if (entry.contextSelection) {
                handleMenuAction({
                  action: entry.action,
                  contextSelection: entry.contextSelection,
                });
              }
            }}
          >
            {entry.label}
            {entry.shortcut ? <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut> : null}
          </ContextMenuItem>
        );
      })}
    </>
  );
}

export function Viewport({
  accessibilityItems = { nodes: [], edges: [] },
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
  handleNodeClick = () => undefined,
  handleNodeHover = () => undefined,
  marqueeSelection,
  menuEntries,
  surface2dProps,
  surface3dProps,
  tooltipData,
  onSurface3dError,
  pluginHost,
}: ViewportProps): ReactElement {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          onMouseLeave={() => handleMouseLeave()}
          onMouseDownCapture={handleMouseDownCapture}
          onMouseMoveCapture={handleMouseMoveCapture}
          onMouseUpCapture={handleMouseUpCapture}
          className="graph-container absolute inset-2 overflow-hidden rounded-md outline-none focus:outline-none"
          style={{ backgroundColor: containerBackgroundColor, borderWidth: 0, borderStyle: 'solid', borderColor, cursor: 'default' }}
          aria-label="Graph Stage"
          tabIndex={0}
        >
          <ViewportSurface
            canvasBackgroundColor={canvasBackgroundColor}
            directionMode={directionMode}
            graphMode={graphMode}
            onSurface3dError={onSurface3dError}
            surface2dProps={surface2dProps}
            surface3dProps={surface3dProps}
          />
          <ViewportPluginOverlay pluginHost={pluginHost} />
          <ViewportMarqueeSelectionOverlay marqueeSelection={marqueeSelection} />
          <GraphAccessibilityOverlay
            accessibilityItems={accessibilityItems}
            graphNodes={surface2dProps.sharedProps.graphData.nodes as FGNode[]}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        <ViewportContextMenuItems
          handleMenuAction={handleMenuAction}
          menuEntries={menuEntries}
        />
      </ContextMenuContent>

      <NodeTooltip
        path={tooltipData.path}
        symbol={tooltipData.symbol}
        size={tooltipData.info?.size}
        lastModified={tooltipData.info?.lastModified}
        incomingCount={tooltipData.info?.incomingCount ?? tooltipData.incomingCount ?? 0}
        outgoingCount={tooltipData.info?.outgoingCount ?? tooltipData.outgoingCount ?? 0}
        plugin={tooltipData.info?.plugin ?? tooltipData.symbol?.plugin}
        nodeRect={tooltipData.nodeRect}
        visible={tooltipData.visible}
        extraActions={tooltipData.pluginActions}
        extraSections={tooltipData.pluginSections}
        pluginHost={pluginHost}
      />
    </ContextMenu>
  );
}

function GraphAccessibilityOverlay({
  accessibilityItems,
  graphNodes,
  onNodeClick,
  onNodeHover,
}: {
  accessibilityItems: GraphAccessibilityItems;
  graphNodes: readonly FGNode[];
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeHover(this: void, node: FGNode | null): void;
}): ReactElement {
  const findNode = (nodeId: string) => graphNodes.find(node => node.id === nodeId) ?? null;
  const handleNodeClick = (
    nodeId: string,
    event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => {
    const node = findNode(nodeId);
    if (!node) return;

    const clickEvent = event instanceof MouseEvent
      ? event
      : new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 'clientX' in event ? event.clientX : 0,
          clientY: 'clientY' in event ? event.clientY : 0,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        });
    onNodeClick(node, clickEvent);
  };
  const handleNodeHover = (nodeId: string) => {
    onNodeHover(findNode(nodeId));
  };

  return (
    <div aria-label="Graph accessibility" className="absolute inset-0 pointer-events-none">
      {accessibilityItems.nodes.map(node => (
        <div
          key={node.id}
          aria-label={node.label}
          role="button"
          tabIndex={0}
          className="absolute rounded-full opacity-0"
          onBlur={() => onNodeHover(null)}
          onClick={event => handleNodeClick(node.id, event)}
          onFocus={() => handleNodeHover(node.id)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleNodeClick(node.id, event);
            }
          }}
          onMouseOut={() => onNodeHover(null)}
          onMouseOver={() => handleNodeHover(node.id)}
          style={{
            height: node.radius * 2,
            left: node.x,
            top: node.y,
            transform: 'translate(-50%, -50%)',
            width: node.radius * 2,
          }}
        />
      ))}
      <div className="sr-only">
        {accessibilityItems.edges.map(edge => (
          <span key={edge.id} aria-label={edge.label} role="img" />
        ))}
      </div>
    </div>
  );
}
