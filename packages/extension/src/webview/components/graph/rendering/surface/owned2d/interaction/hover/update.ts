import type { FGLink, FGNode } from '../../../../../model/build';
import type { OwnedGraphInteractionRuntime } from '../model';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import { setOwnedGraphNodeHover } from './model';
import { resolveHoverTarget } from '../picking';

export function clearHoverForInteraction(runtime: OwnedGraphInteractionRuntime): boolean {
  const hadNode = runtime.hoveredNodeRef.current !== null;
  runtime.hoveredNodeRef.current = null;
  setOwnedGraphNodeHover(runtime.nodeHoverRef.current, null, performance.now());
  if (hadNode) runtime.propsRef.current.sharedProps.onNodeHover(null);
  return runtime.clearLinkHover() || hadNode;
}

function updateNode(runtime: OwnedGraphInteractionRuntime, node: FGNode | null): boolean {
  if (node === runtime.hoveredNodeRef.current) return false;
  runtime.hoveredNodeRef.current = node;
  setOwnedGraphNodeHover(runtime.nodeHoverRef.current, node?.id ?? null, performance.now());
  runtime.propsRef.current.sharedProps.onNodeHover(node);
  return true;
}

function updateLink(runtime: OwnedGraphInteractionRuntime, link: FGLink | null, screen: { x: number; y: number }): boolean {
  if (link === runtime.hoveredLinkRef.current) return false;
  if (!link) runtime.clearLinkHover();
  else { runtime.hoveredLinkRef.current = link; runtime.setLinkTooltip({ link, screen }); }
  return true;
}

export function updateHover(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, world: { x: number; y: number }, screen: { x: number; y: number }): void {
  const { link, node } = resolveHoverTarget(runtime, layout, world);
  if (updateNode(runtime, node)) runtime.requestFrameRef.current();
  if (updateLink(runtime, link, screen)) runtime.requestFrameRef.current();
  else if (link) runtime.setLinkTooltip(current => current ? { ...current, screen } : { link, screen });
}
