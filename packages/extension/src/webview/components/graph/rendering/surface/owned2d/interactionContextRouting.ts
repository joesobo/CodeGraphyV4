import type { PointerEvent as ReactPointerEvent } from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import { canvasPointerGeometry } from './canvasGeometry';
import type { ContextGestureSession, OwnedGraphInteractionRuntime } from './interaction';
import { pickLink, pickNode, screenToWorld } from './interactionPicking';

type ContextTarget = { kind: 'background' } | { kind: 'link'; link: FGLink } | { kind: 'node'; node: FGNode };

function targetAtEvent(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>): ContextTarget | null {
  const layout = runtime.layoutRef.current;
  if (!layout) return null;
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const world = screenToWorld(runtime, pointer);
  const node = pickNode(runtime, layout, world)?.node;
  if (node) return { kind: 'node', node };
  const link = pickLink(runtime, layout, world)?.link;
  return link ? { kind: 'link', link } : { kind: 'background' };
}

function routeClick(runtime: OwnedGraphInteractionRuntime, target: ContextTarget, event: MouseEvent): void {
  const props = runtime.propsRef.current.sharedProps;
  if (target.kind === 'node') props.onNodeClick(target.node, event);
  else if (target.kind === 'link') props.onLinkClick(target.link, event);
  else props.onBackgroundClick(event);
}

function routeRightClick(runtime: OwnedGraphInteractionRuntime, target: ContextTarget, event: MouseEvent): void {
  const props = runtime.propsRef.current.sharedProps;
  if (target.kind === 'node') props.onNodeRightClick(target.node, event);
  else if (target.kind === 'link') props.onLinkRightClick(target.link, event);
  else props.onBackgroundRightClick(event);
}

export function routeOwnedContextGesture(runtime: OwnedGraphInteractionRuntime, session: ContextGestureSession, event: ReactPointerEvent<HTMLCanvasElement>): void {
  if (session.moved) return;
  const target = targetAtEvent(runtime, event);
  if (!target) return;
  if (session.button === 2) routeRightClick(runtime, target, event.nativeEvent);
  else routeClick(runtime, target, event.nativeEvent);
}
