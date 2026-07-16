import { resetOwnedGraphNodeHover } from '../../interaction/hover/model';
import type { WebGpuGraphSecondaryFrame } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphFrameRuntime } from './render';
import type { PreparedOverlayCanvas } from '../drawing/layer';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import {
  expandMinimapBounds,
  finiteMinimapBounds,
  type MinimapBounds,
} from '../../minimap/bounds';
import { fitMinimapProjection } from '../../minimap/projection';
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
  layout: OwnedGraphLayout,
  moving: boolean,
  decision: MinimapRefreshDecision,
): MinimapBounds | undefined {
  const currentBounds = finiteMinimapBounds(layout.engine.x, layout.engine.y);
  if (decision.resetBounds) runtime.minimapBoundsRef.current = null;
  if (!currentBounds) return undefined;
  return moving && !decision.tightenBounds
    ? expandMinimapBounds(runtime.minimapBoundsRef.current ?? undefined, currentBounds)
    : currentBounds;
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
  const decision = scheduleMinimapRefresh(runtime.minimapSchedulerRef.current, {
    graphIdentity: layout,
    moving,
    positionVersion: runtime.positionVersionRef.current,
    styleVersion,
    timestampMs,
  });
  if (!decision.refresh) return undefined;
  const bounds = resolveMinimapBounds(runtime, layout, moving, decision);
  runtime.minimapBoundsRef.current = bounds ?? null;
  const projection = bounds
    ? fitMinimapProjection(bounds, OWNED_GRAPH_MINIMAP_SIZE, MINIMAP_PADDING)
    : null;
  runtime.minimapProjectionRef.current = projection;
  if (!projection) return undefined;
  return {
    backgroundColor: runtime.propsRef.current.backgroundColor,
    camera: projection,
    cssHeight: projection.size,
    cssWidth: projection.size,
    devicePixelRatio: prepared.devicePixelRatio,
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
    return renderer.render({ backgroundColor: props.backgroundColor, camera: runtime.cameraRef.current,
      cssHeight: prepared.height, cssWidth: prepared.width, devicePixelRatio: prepared.devicePixelRatio,
      directionMode: props.directionMode, edgeSources: layout.engine.edgeSources, edgeTargets: layout.engine.edgeTargets,
      getArrowColor: props.getArrowColor, getLinkColor: props.getLinkColor, getLinkOpacity: props.getLinkOpacity,
      getLinkWidth: props.getLinkWidth, getNodeStyle: props.getNodeStyle, hoveredLink: runtime.hoveredLinkRef.current,
      hoveredNodeIndex: hoveredNodeIndex(runtime, layout), hoveredNodeScale: runtime.nodeHoverRef.current.scale,
      links: layout.links, nodes: layout.nodes, nodeX: layout.engine.x, nodeY: layout.engine.y,
      positionVersion: runtime.positionVersionRef.current, styleVersion }, secondaryFrame);
  } catch (error) { failFrame(runtime, layout, error); return null; }
}
