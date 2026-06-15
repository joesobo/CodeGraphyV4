import { useEffect, useRef, useState, type ReactElement } from 'react';
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
import { Viewport } from './view';
import { graphStore } from '../../../store/state';
import { publishGraphViewportScale as publishGraphViewportScaleChange } from './shell/scale';
import { buildRenderingRuntimeOptions } from './shell/runtimeOptions';
import { useGraphViewportModelOptions } from './shell/modelOptions';
import { createGraphViewportSurfaceProps } from './shell/surfaceProps';
import {
	createGraphViewViewportState,
	type GraphViewport2dControls,
} from './shell/viewportState';
import {
  createGraphAccessibilityItems,
  type GraphAccessibilityItems,
  type GraphScreenProjector,
} from './accessibility';
import type { FGLink, FGNode } from '../model/build';

export interface GraphViewportShellProps {
  appearance?: GraphAppearance;
  callbacks: UseGraphCallbacksResult;
  graphDataLayoutKey: string;
  graphState: GraphRuntime;
  graphViewContributions?: CoreGraphViewContributionSet;
  handleEngineStop(this: void): void;
  interactions: UseGraphInteractionRuntimeResult;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
  viewState: GraphViewStoreState;
}

function createGraphAccessibilitySignature(
  nodes: readonly FGNode[],
  links: readonly FGLink[],
): string {
  const nodeSignature = nodes
    .map(node => `${node.id}:${node.size}:${Number.isFinite(node.x) && Number.isFinite(node.y) ? 'ready' : 'pending'}`)
    .join('|');
  const linkSignature = links
    .map(link => `${link.id}:${resolveLinkEndpoint(link.source)}:${resolveLinkEndpoint(link.target)}`)
    .join('|');

  return `${nodeSignature}::${linkSignature}`;
}

function resolveLinkEndpoint(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export function GraphViewportShell({
  appearance,
  callbacks,
  graphDataLayoutKey,
  graphState,
  graphViewContributions,
  handleEngineStop,
  interactions,
  pluginHost,
  theme,
  viewState,
}: GraphViewportShellProps): ReactElement {
  const lastPublishedViewportScaleRef = useRef<number | null>(null);
  const lastAccessibilitySignatureRef = useRef('');
  const accessibilityDirtyRef = useRef(true);
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
    viewportRuntime,
    viewState,
  });

  const publishGraphViewportScale = (globalScale: number): void => {
    lastPublishedViewportScaleRef.current = publishGraphViewportScaleChange({
      globalScale,
      graphMode: viewState.graphMode,
      previousScale: lastPublishedViewportScaleRef.current,
      publish: scale => graphStore.getState().setGraphViewportScale(scale),
    });
  };

  const publishGraphViewViewportState = (globalScale: number): void => {
    if (!pluginHost) {
      return;
    }

    if (pluginHost.hasGraphViewViewportConsumers?.() === false) {
      return;
    }

    const graph = graphState.renderer.fg2dRef.current as GraphViewport2dControls | undefined;
    pluginHost.setGraphViewViewportState(createGraphViewViewportState({
      globalScale,
      graph,
      graphMode: viewState.graphMode,
      nodes: graphState.renderer.graphDataRef.current.nodes,
      timelineActive: viewState.timelineActive,
    }));
  };

  const publishGraphAccessibilityItems = (): void => {
    if (viewState.graphMode !== '2d') {
      return;
    }

    if (!accessibilityDirtyRef.current) {
      return;
    }

    const graph = graphState.renderer.fg2dRef.current as GraphScreenProjector | undefined;
    const nodes = graphState.renderer.graphDataRef.current.nodes;
    const links = graphState.renderer.graphDataRef.current.links;
    const ready = nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y));
    if (!ready) {
      return;
    }

    const signature = createGraphAccessibilitySignature(nodes, links);
    if (signature === lastAccessibilitySignatureRef.current) {
      accessibilityDirtyRef.current = false;
      return;
    }

    lastAccessibilitySignatureRef.current = signature;
    const items = createGraphAccessibilityItems(
      nodes,
      links,
      typeof graph?.graph2ScreenCoords === 'function' ? graph : undefined,
    );
    setAccessibilityItems(items);
    accessibilityDirtyRef.current = false;
  };

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
    onRenderFramePost: (ctx, globalScale) => {
      publishGraphViewportScale(globalScale);
      publishGraphViewViewportState(globalScale);
      publishGraphAccessibilityItems();
      viewportRuntime.renderPluginOverlays(ctx, globalScale);
    },
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
