import type { MouseEvent as ReactMouseEvent, ReactElement, Ref } from 'react';
import type { DirectionMode } from '../../../shared/settings/modes';
import type { GraphTooltipState } from './tooltipModel';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../ui/context/menu';
import { NodeTooltip } from '../nodeTooltip/view';
import type {
  GraphContextMenuAction,
  GraphContextMenuEntry,
} from './contextMenu/contracts';
import {
  Surface2d,
  type Surface2dProps,
} from './rendering/surface/view2d';
import {
  DeferredSurface3d,
  type Surface3dProps,
} from './rendering/surface/view3d';
import { SurfaceFallbackBoundary } from './rendering/surface/fallbackBoundary';
import type { WebviewPluginHost } from '../../pluginHost/manager';
import { SlotHost } from '../../pluginHost/slotHost/view';

export interface ViewportProps {
  backgroundColor: string;
  borderColor: string;
  containerRef: Ref<HTMLDivElement>;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
  handleContextMenu: (this: void) => void;
  handleMenuAction: (this: void, action: GraphContextMenuAction) => void;
  handleMouseDownCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: (this: void) => void;
  handleMouseMoveCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseUpCapture: (this: void, event: ReactMouseEvent<HTMLDivElement>) => void;
  menuEntries: GraphContextMenuEntry[];
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
  tooltipData: GraphTooltipState;
  onSurface3dError?: (error: Error) => void;
  pluginHost?: WebviewPluginHost;
}

export function Viewport({
  backgroundColor,
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
          onContextMenu={() => handleContextMenu()}
          onMouseLeave={() => handleMouseLeave()}
          onMouseDownCapture={handleMouseDownCapture}
          onMouseMoveCapture={handleMouseMoveCapture}
          onMouseUpCapture={handleMouseUpCapture}
          className="graph-container absolute inset-0 rounded-lg m-1 outline-none focus:outline-none"
          style={{ backgroundColor, borderWidth: 1, borderStyle: 'solid', borderColor, cursor: 'default' }}
          tabIndex={0}
        >
          {graphMode === '2d' ? (
            <Surface2d
              {...surface2dProps}
              backgroundColor={backgroundColor}
              directionMode={directionMode}
            />
          ) : (
            <SurfaceFallbackBoundary
              resetKey={graphMode}
              onError={onSurface3dError}
              fallback={(
                <Surface2d
                  {...surface2dProps}
                  backgroundColor={backgroundColor}
                  directionMode={directionMode}
                />
              )}
            >
              <DeferredSurface3d
                {...surface3dProps}
                backgroundColor={backgroundColor}
                directionMode={directionMode}
                fallback={(
                  <Surface2d
                    {...surface2dProps}
                    backgroundColor={backgroundColor}
                    directionMode={directionMode}
                  />
                )}
              />
            </SurfaceFallbackBoundary>
          )}
          {pluginHost ? (
            <SlotHost
              pluginHost={pluginHost}
              slot="graph-overlay"
              data-testid="graph-overlay-slot"
              className="absolute inset-0 z-10 pointer-events-none"
            />
          ) : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {menuEntries.map(entry => {
          if (entry.kind === 'separator') return <ContextMenuSeparator key={entry.id} />;
          return (
            <ContextMenuItem
              key={entry.id}
              className={entry.destructive ? 'text-red-400 focus:text-red-300' : undefined}
              onClick={() => handleMenuAction(entry.action)}
            >
              {entry.label}
              {entry.shortcut ? <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut> : null}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>

      <NodeTooltip
        path={tooltipData.path}
        size={tooltipData.info?.size}
        lastModified={tooltipData.info?.lastModified}
        incomingCount={tooltipData.info?.incomingCount ?? 0}
        outgoingCount={tooltipData.info?.outgoingCount ?? 0}
        plugin={tooltipData.info?.plugin}
        visits={tooltipData.info?.visits}
        nodeRect={tooltipData.nodeRect}
        visible={tooltipData.visible}
        extraActions={tooltipData.pluginActions}
        extraSections={tooltipData.pluginSections}
        pluginHost={pluginHost}
      />
    </ContextMenu>
  );
}
