import type { MouseEvent as ReactMouseEvent, ReactElement, Ref } from 'react';
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
  GraphContextMenuAction,
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

export interface ViewportProps {
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
  containerRef: Ref<HTMLDivElement>;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
  handleContextMenu: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMenuAction: (this: void, action: GraphContextMenuAction) => void;
  handleMouseDownCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: (this: void) => void;
  handleMouseMoveCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseUpCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
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
            onClick={() => handleMenuAction(entry.action)}
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
