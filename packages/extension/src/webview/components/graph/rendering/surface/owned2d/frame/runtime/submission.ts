import { resetOwnedGraphNodeHover } from '../../interaction/hover/model';
import {
  measureGraphSceneBounds,
  type WebGpuGraphSecondaryFrame,
} from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphFrameRuntime } from './render';
import type { PreparedOverlayCanvas } from '../drawing/layer';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import {
  expandMinimapBounds,
  type MinimapBounds,
} from '../../minimap/bounds';
import { fitMinimapProjection, type MinimapProjection } from '../../minimap/projection';
import { fitMinimapSceneProjection, type MinimapScene } from '../../minimap/scene';
import {
  OWNED_GRAPH_MINIMAP_SIZE,
  updateOwnedGraphMinimapOverlay,
} from '../../minimap/presentation';
import {
  scheduleMinimapRefresh,
  type MinimapRefreshDecision,
} from '../../minimap/scheduling';
import { projectMinimapViewport } from '../../minimap/viewport';

const MINIMAP_PADDING = 12;

function hoveredNodeIndex(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout): number {
  const hover = runtime.nodeHoverRef.current;
  if (hover.nodeId === null) return -1;
  const index = layout.engine.getNodeIndex(hover.nodeId);
  if (index === undefined) {
    const nodeId = hover.nodeId;
    resetOwnedGraphNodeHover(hover);
    if (runtime.hoveredNodeRef.current?.id === nodeId) {
      runtime.hoveredNodeRef.current = null;
      runtime.propsRef.current.sharedProps.onNodeHover(null);
    }
    return -1;
  }
  const currentNode = layout.nodes[index];
  if (hover.transition?.targetScale !== 1 && runtime.hoveredNodeRef.current?.id === hover.nodeId
    && runtime.hoveredNodeRef.current !== currentNode) {
    runtime.hoveredNodeRef.current = currentNode;
    runtime.propsRef.current.sharedProps.onNodeHover(currentNode);
  }
  return index;
}

function failFrame(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, error: unknown): void {
  runtime.gpuRendererRef.current?.dispose();
  runtime.gpuRendererRef.current = null;
  runtime.rendererOperationalRef.current = false;
  layout.engine.pause();
  runtime.onRendererError(error instanceof Error ? error.message : String(error));
}

function resolveMinimapBounds(
  runtime: OwnedGraphFrameRuntime,
  currentBounds: MinimapBounds | undefined,
  moving: boolean,
  decision: MinimapRefreshDecision,
): MinimapBounds | undefined {
  if (decision.resetBounds) runtime.minimapBoundsRef.current = null;
  if (!currentBounds) return undefined;
  return moving && !decision.tightenBounds
    ? expandMinimapBounds(runtime.minimapBoundsRef.current ?? undefined, currentBounds)
    : currentBounds;
}

interface MinimapSurfaceDimensions {
  height: number;
  width: number;
}

function minimapSurfaceDimensions(runtime: OwnedGraphFrameRuntime): MinimapSurfaceDimensions {
  const panelBounds = runtime.minimapPanelRef.current?.getBoundingClientRect();
  return {
    height: panelBounds?.height || OWNED_GRAPH_MINIMAP_SIZE,
    width: panelBounds?.width || OWNED_GRAPH_MINIMAP_SIZE,
  };
}

function resolveMinimapProjection(
  runtime: OwnedGraphFrameRuntime,
  scene: MinimapScene,
  dimensions: MinimapSurfaceDimensions,
  moving: boolean,
  decision: MinimapRefreshDecision,
): MinimapProjection | null {
  const size = Math.min(dimensions.width, dimensions.height);
  const fittedProjection = fitMinimapSceneProjection(scene, size, MINIMAP_PADDING);
  const currentBounds = fittedProjection
    ? measureGraphSceneBounds({ ...scene, zoom: fittedProjection.zoom })
    : undefined;
  const bounds = resolveMinimapBounds(runtime, currentBounds, moving, decision);
  runtime.minimapBoundsRef.current = bounds ?? null;
  if (!bounds || bounds === currentBounds) return fittedProjection ?? null;
  return fitMinimapProjection(bounds, size, MINIMAP_PADDING);
}

function prepareMinimapSecondaryFrame(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  prepared: PreparedOverlayCanvas,
  moving: boolean,
  timestampMs: number,
  styleVersion: number,
): WebGpuGraphSecondaryFrame | undefined {
  if (!runtime.minimapSurfaceRegisteredRef.current) return undefined;
  const dimensions = minimapSurfaceDimensions(runtime);
  const decision = scheduleMinimapRefresh(runtime.minimapSchedulerRef.current, {
    devicePixelRatio: prepared.devicePixelRatio,
    graphIdentity: layout,
    graphRevision: layout.membershipRevision,
    moving,
    positionVersion: runtime.positionVersionRef.current,
    styleVersion,
    surfaceHeight: dimensions.height,
    surfaceWidth: dimensions.width,
    timestampMs,
  });
  if (!decision.refresh) return undefined;
  const scene: MinimapScene = {
    getNodeStyle: runtime.propsRef.current.getBaseNodeStyle,
    links: layout.links,
    nodes: layout.nodes,
  };
  const projection = resolveMinimapProjection(runtime, scene, dimensions, moving, decision);
  runtime.minimapProjectionRef.current = projection;
  if (!projection) return undefined;
  return {
    backgroundColor: runtime.propsRef.current.backgroundColor,
    camera: projection,
    cssHeight: dimensions.height,
    cssWidth: dimensions.width,
    devicePixelRatio: prepared.devicePixelRatio,
    getLinkColor: runtime.propsRef.current.getBaseLinkColor,
    getLinkOpacity: runtime.propsRef.current.getBaseLinkOpacity,
    getLinkWidth: runtime.propsRef.current.getBaseLinkWidth,
    getNodeStyle: runtime.propsRef.current.getBaseNodeStyle,
  };
}

function presentMinimapViewport(
  runtime: OwnedGraphFrameRuntime,
  prepared: PreparedOverlayCanvas,
): void {
  const projection = runtime.minimapProjectionRef.current;
  const panel = runtime.minimapPanelRef.current;
  if (panel) panel.hidden = projection === null;
  const viewportBox = runtime.minimapViewportBoxRef.current;
  const directionIndicator = runtime.minimapDirectionIndicatorRef.current;
  if (!projection || !viewportBox || !directionIndicator) return;
  updateOwnedGraphMinimapOverlay(
    viewportBox,
    directionIndicator,
    projectMinimapViewport(projection, {
      camera: runtime.cameraRef.current,
      viewportHeight: prepared.height,
      viewportWidth: prepared.width,
    }),
  );
}

export function submitOwnedWebGpuFrame(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  prepared: PreparedOverlayCanvas,
  moving: boolean,
  timestampMs: number,
): number | null {
  const renderer = runtime.gpuRendererRef.current;
  if (!renderer) return null;
  runtime.secondaryRefreshMsRef.current = undefined;
  const props = runtime.propsRef.current;
  try {
    const styleVersion = props.getStyleRevision();
    const secondaryFrame = prepareMinimapSecondaryFrame(
      runtime,
      layout,
      prepared,
      moving,
      timestampMs,
      styleVersion,
    );
    presentMinimapViewport(runtime, prepared);
    const submissionId = renderer.render({ backgroundColor: props.backgroundColor, camera: runtime.cameraRef.current,
      cssHeight: prepared.height, cssWidth: prepared.width, devicePixelRatio: prepared.devicePixelRatio,
      directionMode: props.directionMode, edgeSources: layout.engine.edgeSources, edgeTargets: layout.engine.edgeTargets,
      getArrowColor: props.getArrowColor, getLinkColor: props.getLinkColor, getLinkOpacity: props.getLinkOpacity,
      getLinkWidth: props.getLinkWidth, getNodeStyle: props.getNodeStyle, hoveredLink: runtime.hoveredLinkRef.current,
      hoveredNodeIndex: hoveredNodeIndex(runtime, layout), hoveredNodeScale: runtime.nodeHoverRef.current.scale,
      links: layout.links, nodes: layout.nodes, nodeX: layout.engine.x, nodeY: layout.engine.y,
      positionVersion: runtime.positionVersionRef.current, styleVersion }, secondaryFrame);
    runtime.secondaryRefreshMsRef.current = renderer.lastSecondaryRefreshCpuMs?.();
    return submissionId;
  } catch (error) { failFrame(runtime, layout, error); return null; }
}
