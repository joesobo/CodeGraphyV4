import { resetOwnedGraphNodeHover } from '../../interaction/hover/model';
import type { OwnedGraphFrameRuntime } from './render';
import type { PreparedOverlayCanvas } from '../drawing/layer';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import { finiteMinimapBounds, fitMinimapProjection } from '../../minimap/projection';
import { OWNED_GRAPH_MINIMAP_SIZE } from '../../minimap/presentation';

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

export function submitOwnedWebGpuFrame(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas): number | null {
  const renderer = runtime.gpuRendererRef.current;
  if (!renderer) return null;
  const props = runtime.propsRef.current;
  try {
    const bounds = finiteMinimapBounds(layout.engine.x, layout.engine.y);
    const projection = bounds
      ? fitMinimapProjection(bounds, OWNED_GRAPH_MINIMAP_SIZE, MINIMAP_PADDING)
      : null;
    runtime.minimapProjectionRef.current = projection;
    const secondaryFrame = runtime.minimapSurfaceRegisteredRef.current && projection
      ? {
          backgroundColor: props.backgroundColor,
          camera: projection,
          cssHeight: projection.size,
          cssWidth: projection.size,
          devicePixelRatio: prepared.devicePixelRatio,
        }
      : undefined;
    return renderer.render({ backgroundColor: props.backgroundColor, camera: runtime.cameraRef.current,
      cssHeight: prepared.height, cssWidth: prepared.width, devicePixelRatio: prepared.devicePixelRatio,
      directionMode: props.directionMode, edgeSources: layout.engine.edgeSources, edgeTargets: layout.engine.edgeTargets,
      getArrowColor: props.getArrowColor, getLinkColor: props.getLinkColor, getLinkOpacity: props.getLinkOpacity,
      getLinkWidth: props.getLinkWidth, getNodeStyle: props.getNodeStyle, hoveredLink: runtime.hoveredLinkRef.current,
      hoveredNodeIndex: hoveredNodeIndex(runtime, layout), hoveredNodeScale: runtime.nodeHoverRef.current.scale,
      links: layout.links, nodes: layout.nodes, nodeX: layout.engine.x, nodeY: layout.engine.y,
      positionVersion: runtime.positionVersionRef.current, styleVersion: props.getStyleRevision() }, secondaryFrame);
  } catch (error) { failFrame(runtime, layout, error); return null; }
}
