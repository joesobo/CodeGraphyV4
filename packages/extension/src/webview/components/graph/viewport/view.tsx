import {
  lazy,
  memo,
  Suspense,
  useRef,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
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
import type { Surface3dProps } from '../rendering/surface/view/threeDimensional';
import { SurfaceFallbackBoundary } from '../rendering/surface/view/fallbackBoundary';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { SlotHost } from '../../../pluginHost/slotHost/view';
import type { GraphAccessibilityItems } from './accessibility';
import type { FGLink, FGNode } from '../model/build';

const LazyDeferredSurface3d = lazy(async () => {
  await import('../../../three/runtime');
  const module = await import('../rendering/surface/view/threeDimensional');
  return { default: module.DeferredSurface3d };
});

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
  menuEntries: GraphContextMenuEntry[];
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
  tooltipData: GraphTooltipState;
  onSurface3dError?: (error: Error) => void;
  pluginHost?: WebviewPluginHost;
}

const EMPTY_ACCESSIBILITY_ITEMS: GraphAccessibilityItems = { nodes: [], edges: [] };
const ignoreEdgeContextMenu: NonNullable<ViewportProps['handleEdgeContextMenu']> = () => undefined;
const ignoreNodeClick: NonNullable<ViewportProps['handleNodeClick']> = () => undefined;
const ignoreNodeContextMenu: NonNullable<ViewportProps['handleNodeContextMenu']> = () => undefined;
const ignoreNodeHover: NonNullable<ViewportProps['handleNodeHover']> = () => undefined;

type NodeTooltipComponentProps = ComponentProps<typeof NodeTooltip>;

interface ResolvedViewportHandlers {
  handleEdgeContextMenu: NonNullable<ViewportProps['handleEdgeContextMenu']>;
  handleNodeClick: NonNullable<ViewportProps['handleNodeClick']>;
  handleNodeContextMenu: NonNullable<ViewportProps['handleNodeContextMenu']>;
  handleNodeHover: NonNullable<ViewportProps['handleNodeHover']>;
}

function resolveViewportAccessibilityItems(
  accessibilityItems: ViewportProps['accessibilityItems'],
): GraphAccessibilityItems {
  return accessibilityItems ?? EMPTY_ACCESSIBILITY_ITEMS;
}

function resolveViewportHandlers({
  handleEdgeContextMenu,
  handleNodeClick,
  handleNodeContextMenu,
  handleNodeHover,
}: Pick<
  ViewportProps,
  'handleEdgeContextMenu' | 'handleNodeClick' | 'handleNodeContextMenu' | 'handleNodeHover'
>): ResolvedViewportHandlers {
  return {
    handleEdgeContextMenu: handleEdgeContextMenu ?? ignoreEdgeContextMenu,
    handleNodeClick: handleNodeClick ?? ignoreNodeClick,
    handleNodeContextMenu: handleNodeContextMenu ?? ignoreNodeContextMenu,
    handleNodeHover: handleNodeHover ?? ignoreNodeHover,
  };
}

function createNodeTooltipProps({
  pluginHost,
  tooltipData,
}: Pick<ViewportProps, 'pluginHost' | 'tooltipData'>): NodeTooltipComponentProps {
  return {
    extraActions: tooltipData.pluginActions,
    extraSections: tooltipData.pluginSections,
    incomingCount: tooltipData.incomingCount ?? tooltipData.info?.incomingCount ?? 0,
    lastModified: tooltipData.info?.lastModified,
    nodeRect: tooltipData.nodeRect,
    outgoingCount: tooltipData.outgoingCount ?? tooltipData.info?.outgoingCount ?? 0,
    path: tooltipData.path,
    plugin: tooltipData.info?.plugin ?? tooltipData.symbol?.plugin,
    pluginHost,
    size: tooltipData.info?.size,
    symbol: tooltipData.symbol,
    visible: tooltipData.visible,
  };
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
      <Suspense fallback={fallback}>
        <LazyDeferredSurface3d
          {...surface3dProps}
          backgroundColor={canvasBackgroundColor}
          directionMode={directionMode}
          fallback={fallback}
        />
      </Suspense>
    </SurfaceFallbackBoundary>
  );
}

function areSurface2dPropsEqual(
  previous: ViewportSurfaceProps['surface2dProps'],
  next: ViewportSurfaceProps['surface2dProps'],
): boolean {
  return propsEqualByKeys(previous, next, SURFACE_2D_PROP_KEYS);
}

function areSurface3dPropsEqual(
  previous: ViewportSurfaceProps['surface3dProps'],
  next: ViewportSurfaceProps['surface3dProps'],
): boolean {
  return propsEqualByKeys(previous, next, SURFACE_3D_PROP_KEYS)
    && propsEqualByKeys(
      previous.nodeThreeObjectContext,
      next.nodeThreeObjectContext,
      NODE_THREE_OBJECT_CONTEXT_KEYS,
    );
}

const SURFACE_2D_PROP_KEYS = [
  'fg2dRef',
  'getArrowColor',
  'getArrowRelPos',
  'getLinkColor',
  'getLinkParticles',
  'getLinkWidth',
  'getParticleColor',
  'linkCanvasObject',
  'nodeCanvasObject',
  'nodePointerAreaPaint',
  'onRenderFramePost',
  'particleSize',
  'particleSpeed',
  'sharedProps',
] as const;

const SURFACE_3D_PROP_KEYS = [
  'fg3dRef',
  'getArrowColor',
  'getLinkColor',
  'getLinkParticles',
  'getLinkWidth',
  'getParticleColor',
  'particleSize',
  'particleSpeed',
  'sharedProps',
] as const;

const NODE_THREE_OBJECT_CONTEXT_KEYS = [
  'graphAppearanceRef',
  'meshesRef',
  'showLabelsRef',
  'spritesRef',
] as const;

function propsEqualByKeys<T extends object, K extends keyof T>(
  previous: T,
  next: T,
  keys: readonly K[],
): boolean {
  return keys.every(key => previous[key] === next[key]);
}

function areViewportSurfacePropsEqual(
  previous: ViewportSurfaceProps,
  next: ViewportSurfaceProps,
): boolean {
  return previous.canvasBackgroundColor === next.canvasBackgroundColor
    && previous.directionMode === next.directionMode
    && previous.graphMode === next.graphMode
    && previous.onSurface3dError === next.onSurface3dError
    && areSurface2dPropsEqual(previous.surface2dProps, next.surface2dProps)
    && areSurface3dPropsEqual(previous.surface3dProps, next.surface3dProps);
}

const MemoizedViewportSurface = memo(ViewportSurface, areViewportSurfacePropsEqual);

function ViewportPluginOverlay({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <>
      <SlotHost
        pluginHost={pluginHost}
        slot="graph-overlay"
        data-codegraphy-layer="graph-overlay"
        data-testid="graph-overlay-slot"
        className="absolute inset-0 z-10 pointer-events-none"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.stage.viewportOverlay"
        data-codegraphy-layer="graph-stage-viewport-overlay"
        data-testid="graph-viewport-overlay-slot"
        className="absolute inset-0 z-30 pointer-events-none"
      />
    </>
  ) : null;
}

function ViewportPluginBackground({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <SlotHost
      pluginHost={pluginHost}
      slot="graph.stage.worldBackground"
      data-codegraphy-layer="graph-stage-world-background"
      data-testid="graph-world-background-slot"
      className="absolute inset-0 z-0 pointer-events-none"
    />
  ) : null;
}

function ViewportPluginWorldOverlay({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <SlotHost
      pluginHost={pluginHost}
      slot="graph.stage.worldOverlay"
      data-codegraphy-layer="graph-stage-world-overlay"
      data-testid="graph-world-overlay-slot"
      className="absolute inset-0 z-10 pointer-events-none"
    />
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
          <ViewportContextMenuItem
            key={entry.id}
            entry={entry}
            handleMenuAction={handleMenuAction}
          />
        );
      })}
    </>
  );
}

function ViewportContextMenuItem({
  entry,
  handleMenuAction,
}: {
  entry: Extract<GraphContextMenuEntry, { kind: 'item' }>;
  handleMenuAction: ViewportProps['handleMenuAction'];
}): ReactElement {
  const handledRef = useRef(false);
  const handleAction = (): void => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;
    queueMicrotask(() => {
      handledRef.current = false;
    });

    if (entry.contextSelection) {
      handleMenuAction({
        action: entry.action,
        contextSelection: entry.contextSelection,
      });
    }
  };

  return (
    <ContextMenuItem
      className={entry.destructive ? 'text-[var(--cg-error-foreground)] focus:text-[var(--cg-error-foreground)]' : undefined}
      data-menu-entry-id={entry.id}
      data-menu-entry-targets={entry.contextSelection?.targets.join('\n') ?? ''}
      disabled={entry.disabled}
      onClick={handleAction}
      onSelect={handleAction}
    >
      {entry.label}
      {entry.shortcut ? <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut> : null}
    </ContextMenuItem>
  );
}

function createMenuEntriesSignature(menuEntries: readonly GraphContextMenuEntry[]): string {
  return menuEntries
    .map(entry => entry.kind === 'separator' ? `${entry.id}:separator` : `${entry.id}:${entry.label}`)
    .join('|');
}

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

function toNativeMouseEvent(
  type: 'click' | 'contextmenu',
  event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
): MouseEvent {
  const nativeEvent = getNativeMouseEvent(event);
  if (nativeEvent) {
    return nativeEvent;
  }

  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: mouseButtonForEventType(type),
    buttons: mouseButtonForEventType(type),
    clientX: getMouseEventCoordinate(event, 'clientX'),
    clientY: getMouseEventCoordinate(event, 'clientY'),
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  });
}

function getNativeMouseEvent(
  event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
): MouseEvent | undefined {
  if (event instanceof MouseEvent) {
    return event;
  }

  return event.nativeEvent instanceof MouseEvent ? event.nativeEvent : undefined;
}

function mouseButtonForEventType(type: 'click' | 'contextmenu'): number {
  return type === 'contextmenu' ? 2 : 0;
}

function getMouseEventCoordinate(
  event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  key: 'clientX' | 'clientY',
): number {
  if (!(key in event)) {
    return 0;
  }

  return (event as MouseEvent | ReactMouseEvent<HTMLElement>)[key];
}

function isKeyboardActivation(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

function handleAccessibilityNodeKeyDown(
  nodeId: string,
  handleNodeClick: (
    nodeId: string,
    event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => void,
  event: ReactKeyboardEvent<HTMLElement>,
): void {
  if (!isKeyboardActivation(event.key)) {
    return;
  }

  event.preventDefault();
  handleNodeClick(nodeId, event);
}

function GraphAccessibilityOverlay({
  accessibilityItems,
  graphLinks,
  graphNodes,
  onEdgeContextMenu,
  onNodeClick,
  onNodeContextMenu,
  onNodeHover,
}: {
  accessibilityItems: GraphAccessibilityItems;
  graphLinks: readonly FGLink[];
  graphNodes: readonly FGNode[];
  onEdgeContextMenu(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeContextMenu(this: void, nodeId: string, event: MouseEvent): void;
  onNodeHover(this: void, node: FGNode | null): void;
}): ReactElement {
  const findNode = (nodeId: string) => graphNodes.find(node => node.id === nodeId) ?? null;
  const findLink = (edgeId: string) => graphLinks.find(link => link.id === edgeId) ?? null;
  const handleNodeClick = (
    nodeId: string,
    event: MouseEvent | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => {
    const node = findNode(nodeId);
    if (!node) return;

    onNodeClick(node, toNativeMouseEvent('click', event));
  };
  const handleNodeContextMenu = (
    nodeId: string,
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    if (!findNode(nodeId)) return;

    event.preventDefault();
    event.stopPropagation();
    onNodeContextMenu(nodeId, toNativeMouseEvent('contextmenu', event));
  };
  const handleEdgeContextMenu = (
    edgeId: string,
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    const link = findLink(edgeId);
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();
    onEdgeContextMenu(link, toNativeMouseEvent('contextmenu', event));
  };
  const handleNodeHover = (nodeId: string) => {
    onNodeHover(findNode(nodeId));
  };

  return (
    <div
      aria-label="Graph accessibility"
      className="absolute inset-0 pointer-events-none"
      data-codegraphy-layer="graph-accessibility"
    >
      {accessibilityItems.nodes.map(node => (
        <div
          key={node.id}
          aria-label={node.label}
          role="button"
          tabIndex={0}
          className="absolute rounded-full opacity-0"
          onBlur={() => onNodeHover(null)}
          onClick={event => handleNodeClick(node.id, event)}
          onContextMenu={event => handleNodeContextMenu(node.id, event)}
          onFocus={() => handleNodeHover(node.id)}
          onKeyDown={event => handleAccessibilityNodeKeyDown(node.id, handleNodeClick, event)}
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
          <span
            key={edge.id}
            aria-label={edge.label}
            role="img"
            onContextMenu={event => handleEdgeContextMenu(edge.id, event)}
          />
        ))}
      </div>
    </div>
  );
}
