import { resetOwnedGraphNodeHover } from './nodeHover';
import type { OwnedGraphFrameRuntime } from './frame';
import type { PreparedOverlayCanvas } from './frameOverlay';
import type { OwnedGraphLayout } from './layout';

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

export function submitOwnedWebGpuFrame(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas): boolean {
  const renderer = runtime.gpuRendererRef.current;
  if (!renderer) return false;
  const props = runtime.propsRef.current;
  try {
    renderer.render({ backgroundColor: props.backgroundColor, camera: runtime.cameraRef.current,
      cssHeight: prepared.height, cssWidth: prepared.width, devicePixelRatio: prepared.devicePixelRatio,
      directionMode: props.directionMode, edgeSources: layout.engine.edgeSources, edgeTargets: layout.engine.edgeTargets,
      getArrowColor: props.getArrowColor, getLinkColor: props.getLinkColor, getLinkOpacity: props.getLinkOpacity,
      getLinkWidth: props.getLinkWidth, getNodeStyle: props.getNodeStyle, hoveredLink: runtime.hoveredLinkRef.current,
      hoveredNodeIndex: hoveredNodeIndex(runtime, layout), hoveredNodeScale: runtime.nodeHoverRef.current.scale,
      links: layout.links, nodes: layout.nodes, nodeX: layout.engine.x, nodeY: layout.engine.y,
      positionVersion: runtime.positionVersionRef.current, styleVersion: props.getStyleRevision() });
    return true;
  } catch (error) { failFrame(runtime, layout, error); return false; }
}
