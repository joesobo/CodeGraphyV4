import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { ThemeKind } from '../../../theme/useTheme';
import type { GraphAppearance } from '../appearance/model';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { GraphViewStoreState } from '../view/store';
import type { UseGraphCallbacksResult } from '../rendering/useGraphCallbacks';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { GraphRuntime } from '../runtime/use/state';
import { useGraphRenderingRuntime } from '../runtime/use/rendering';
import { useGraphEventEffects } from '../runtime/use/events/effects';
import { Viewport, type ViewportProps } from './view';
import { graphStore } from '../../../store/state';
import { publishGraphViewportScale as publishGraphViewportScaleChange } from './shell/scale';
import { buildRenderingRuntimeOptions } from './shell/runtimeOptions';
import { useGraphViewportModelOptions } from './shell/modelOptions';
import { createGraphViewportSurfaceProps } from './shell/surfaceProps';
import { publishCurrentGraphAccessibilityItems } from './shell/accessibilityItems';
import { publishPluginGraphViewViewportState } from './shell/pluginState';
import type { GraphViewport2dControls } from './shell/state';
import {
  type GraphAccessibilityItems,
  type GraphScreenProjector,
} from './accessibility';
import {
  webviewRenderReadyControl,
  type WebviewRenderReadyControl,
} from '../../../perf/renderReady/control';

export interface GraphViewportShellProps {
  appearance?: GraphAppearance;
  callbacks: UseGraphCallbacksResult;
  graphDataLayoutKey: string;
  graphState: GraphRuntime;
  graphViewContributions?: CoreGraphViewContributionSet;
  handleEngineStop(this: void): void;
  onEngineTick?: (this: void) => void;
  interactions: UseGraphInteractionRuntimeResult;
  pluginHost?: WebviewPluginHost;
  renderReadyControl?: Pick<
    WebviewRenderReadyControl,
    'engineTick' | 'graphChanged' | 'renderFramePost'
  >;
  theme: ThemeKind;
  viewState: GraphViewStoreState;
}

export function GraphViewportShell({
  appearance,
  callbacks,
  graphDataLayoutKey,
  graphState,
  graphViewContributions,
  handleEngineStop,
  onEngineTick,
  interactions,
  pluginHost,
  renderReadyControl = webviewRenderReadyControl,
  theme,
  viewState,
}: GraphViewportShellProps): ReactElement {
  const lastPublishedViewportScaleRef = useRef<number | null>(null);
  const lastAccessibilitySignatureRef = useRef('');
  const accessibilityDirtyRef = useRef(true);
  const renderFramePostRef = useRef<ViewportProps['surface2dProps']['onRenderFramePost']>(() => undefined);
  const [accessibilityItems, setAccessibilityItems] = useState<GraphAccessibilityItems>({
    nodes: [],
    edges: [],
  });

  const viewportRuntime = useGraphRenderingRuntime(buildRenderingRuntimeOptions({
    appearance,
    callbacks,
    graphDataLayoutKey,
    graphState,
    graphViewContributions,
    pluginHost,
    theme,
    viewState,
  }));

  const handleEngineTick = useCallback((): void => {
    renderReadyControl.engineTick();
    onEngineTick?.();
  }, [onEngineTick, renderReadyControl]);

  useGraphEventEffects({
    containerRef: graphState.renderer.containerRef,
    dataRef: graphState.dataRef,
    directionColorRef: graphState.directionColorRef,
    directionModeRef: graphState.directionModeRef,
    graphDataRef: graphState.renderer.graphDataRef,
    graphMode: viewState.graphMode,
    interactionHandlers: interactions.interactionHandlers,
    fileInfoCacheRef: graphState.renderCaches.fileInfoCacheRef,
    selectedNodes: graphState.selection.selectedNodeIds,
    setTooltipData: interactions.setTooltipData,
    showLabelsRef: graphState.showLabelsRef,
    themeRef: graphState.themeRef,
    tooltipPath: interactions.tooltipData.path,
  });

  const viewportModel = useGraphViewportModelOptions({
    appearance,
    graphState,
    graphViewContributions,
    handleEngineStop,
    interactions,
    onEngineTick: handleEngineTick,
    viewportRuntime,
    viewState,
  });
  const graphRevision = graphState.dataRef.current;

  useLayoutEffect(() => {
    renderReadyControl.graphChanged(viewportModel.sharedProps.cooldownTicks > 0);
  }, [
    graphDataLayoutKey,
    graphRevision,
    renderReadyControl,
    viewportModel.sharedProps.cooldownTicks,
  ]);

  const publishGraphViewportScale = (globalScale: number): void => {
    lastPublishedViewportScaleRef.current = publishGraphViewportScaleChange({
      globalScale,
      graphMode: viewState.graphMode,
      previousScale: lastPublishedViewportScaleRef.current,
      publish: scale => graphStore.getState().setGraphViewportScale(scale),
    });
  };

  const publishGraphViewViewportState = (globalScale: number): void => {
    publishPluginGraphViewViewportState({
      globalScale,
      graph: graphState.renderer.fg2dRef.current as GraphViewport2dControls | undefined,
      graphMode: viewState.graphMode,
      nodes: graphState.renderer.graphDataRef.current.nodes,
      pluginHost,
      timelineActive: viewState.timelineActive,
    });
  };

  const publishGraphAccessibilityItems = (): void => {
    const nodes = graphState.renderer.graphDataRef.current.nodes;
    const links = graphState.renderer.graphDataRef.current.links;
    const graph = graphState.renderer.fg2dRef.current as GraphScreenProjector | undefined;
    publishCurrentGraphAccessibilityItems({
      accessibilityDirtyRef,
      graph: typeof graph?.graph2ScreenCoords === 'function' ? graph : undefined,
      graphMode: viewState.graphMode,
      lastAccessibilitySignatureRef,
      links,
      nodes,
      setAccessibilityItems,
    });
  };

  renderFramePostRef.current = (ctx, globalScale) => {
    const graphData = graphState.renderer.graphDataRef.current;
    renderReadyControl.renderFramePost({
      nodeCount: graphData.nodes.length,
      edgeCount: graphData.links.length,
    });
    publishGraphViewportScale(globalScale);
    publishGraphViewViewportState(globalScale);
    publishGraphAccessibilityItems();
    viewportRuntime.renderPluginOverlays(ctx, globalScale);
  };

  const handleRenderFramePost = useCallback<ViewportProps['surface2dProps']['onRenderFramePost']>(
    (ctx, globalScale) => renderFramePostRef.current(ctx, globalScale),
    [],
  );

  useEffect(() => {
    return () => {
      pluginHost?.setGraphViewViewportState(null);
    };
  }, [pluginHost]);

  useEffect(() => {
    accessibilityDirtyRef.current = true;
  }, [graphDataLayoutKey, viewState.graphMode]);

  const surfaceProps = createGraphViewportSurfaceProps({
    callbacks,
    graphState,
    onRenderFramePost: handleRenderFramePost,
    sharedProps: viewportModel.sharedProps,
    viewState,
  });
  return (
    <Viewport
      accessibilityItems={accessibilityItems}
      canvasBackgroundColor={viewportModel.canvasBackgroundColor}
      containerBackgroundColor={viewportModel.containerBackgroundColor}
      borderColor={viewportModel.borderColor}
      containerRef={graphState.renderer.containerRef}
      directionMode={viewState.directionMode}
      graphMode={viewState.graphMode}
      handleContextMenu={interactions.handleContextMenu}
      handleMenuAction={interactions.handleMenuAction}
      handleMouseDownCapture={interactions.handleMouseDownCapture}
      handleMouseLeave={interactions.handleMouseLeave}
      handleMouseMoveCapture={interactions.handleMouseMoveCapture}
      handleMouseUpCapture={interactions.handleMouseUpCapture}
      handleEdgeContextMenu={interactions.handleLinkRightClick}
      handleNodeClick={interactions.interactionHandlers.handleNodeClick}
      handleNodeContextMenu={interactions.handleNodeContextMenuById}
      handleNodeHover={interactions.handleNodeHover}
      menuEntries={viewportModel.menuEntries}
      marqueeSelection={interactions.marqueeSelection}
      surface2dProps={surfaceProps.surface2dProps}
      surface3dProps={surfaceProps.surface3dProps}
      tooltipData={interactions.tooltipData}
      onSurface3dError={viewportModel.onSurface3dError}
      pluginHost={pluginHost}
    />
  );
}
