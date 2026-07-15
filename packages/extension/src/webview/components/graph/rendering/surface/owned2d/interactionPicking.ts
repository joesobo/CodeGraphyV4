import type { FGLink, FGNode } from '../../../model/build';
import { shouldEnableGraphEdgeHover } from '@codegraphy-dev/graph-renderer';
import { screenToGraph } from './camera';
import type { CanvasPointerGeometry } from './canvasGeometry';
import type { OwnedGraphInteractionRuntime } from './interaction';
import { syncOwnedLayoutNodesAtVersion, type OwnedGraphLayout } from './layout';

export function screenToWorld(runtime: OwnedGraphInteractionRuntime, pointer: CanvasPointerGeometry) {
  return screenToGraph(runtime.cameraRef.current, pointer.width, pointer.height, pointer.x, pointer.y);
}

function synchronize(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout): void {
  runtime.synchronizedPositionVersionRef.current = syncOwnedLayoutNodesAtVersion(layout,
    runtime.positionVersionRef.current, runtime.synchronizedPositionVersionRef.current);
}

export function pickNode(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, world: { x: number; y: number }) {
  synchronize(runtime, layout);
  if (runtime.pickerPositionVersionRef.current !== runtime.positionVersionRef.current) {
    runtime.pickerRef.current.rebuild(layout.nodes);
    runtime.pickerPositionVersionRef.current = runtime.positionVersionRef.current;
  }
  return runtime.pickerRef.current.pick(world, runtime.cameraRef.current.zoom);
}

export function pickLink(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, world: { x: number; y: number }) {
  synchronize(runtime, layout);
  if (runtime.linkPickerPositionVersionRef.current !== runtime.positionVersionRef.current) {
    runtime.linkPickerRef.current.rebuild(layout.links);
    runtime.linkPickerPositionVersionRef.current = runtime.positionVersionRef.current;
  }
  return runtime.linkPickerRef.current.pick(world, runtime.cameraRef.current.zoom);
}

export function resolveHoverTarget(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, world: { x: number; y: number }): { link: FGLink | null; node: FGNode | null } {
  const node = pickNode(runtime, layout, world)?.node ?? null;
  const link = node || !shouldEnableGraphEdgeHover(runtime.cameraRef.current.zoom) ? null : pickLink(runtime, layout, world)?.link ?? null;
  return { link, node };
}
