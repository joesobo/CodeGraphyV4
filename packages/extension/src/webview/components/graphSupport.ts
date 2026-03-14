import type { ForceGraphMethods as FG2DMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import SpriteText from 'three-spritetext';
import type { IGraphEdge } from '../../shared/types';

export type GraphCursorStyle = 'default' | 'pointer';

type StrengthForce = { strength: (value: number) => unknown };
type LinkDistanceForce = { distance: (value: number) => unknown; strength: (value: number) => unknown };

export type FG2DExtMethods<NodeT extends NodeObject = NodeObject, LinkT extends LinkObject = LinkObject> =
  FG2DMethods<NodeT, LinkT> & {
    d3Alpha?: (value: number) => unknown;
    linkDirectionalArrowLength?: (value: number) => unknown;
    linkDirectionalArrowRelPos?: (value: number | ((link: LinkObject) => number)) => unknown;
    linkDirectionalParticles?: (value: number | ((link: LinkObject) => number)) => unknown;
    linkDirectionalParticleWidth?: (value: number) => unknown;
    linkDirectionalParticleSpeed?: (value: number) => unknown;
    linkDirectionalArrowColor?: (value: string | ((link: LinkObject) => string)) => unknown;
    linkDirectionalParticleColor?: (value: string | ((link: LinkObject) => string)) => unknown;
  };

export function isRecordLike(value: unknown): value is Record<string, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function hasStrength(force: unknown): force is StrengthForce {
  if (!isRecordLike(force)) return false;
  return typeof (force as { strength?: unknown }).strength === 'function';
}

export function hasDistanceAndStrength(force: unknown): force is LinkDistanceForce {
  if (!isRecordLike(force)) return false;
  const candidate = force as { distance?: unknown; strength?: unknown };
  return typeof candidate.distance === 'function' && typeof candidate.strength === 'function';
}

export function as2DExtMethods<NodeT extends NodeObject, LinkT extends LinkObject>(
  instance: FG2DMethods<NodeT, LinkT> | undefined
): FG2DExtMethods<NodeT, LinkT> | undefined {
  return instance as FG2DExtMethods<NodeT, LinkT> | undefined;
}

export function setSpriteVisible(sprite: SpriteText, visible: boolean): void {
  (sprite as unknown as { visible: boolean }).visible = visible;
}

export function resolveLinkEndpointId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecordLike(value)) return null;
  const maybeId = (value as { id?: unknown }).id;
  return typeof maybeId === 'string' ? maybeId : null;
}

export function resolveEdgeActionTargetId(
  linkId: string | undefined,
  sourceId: string,
  targetId: string,
  rawEdges: IGraphEdge[]
): string {
  if (linkId && rawEdges.some(edge => edge.id === linkId)) {
    return linkId;
  }

  const forward = rawEdges.find(edge => edge.from === sourceId && edge.to === targetId);
  if (forward) return forward.id;

  const reverse = rawEdges.find(edge => edge.from === targetId && edge.to === sourceId);
  if (reverse) return reverse.id;

  return linkId ?? `${sourceId}->${targetId}`;
}

export function isMacControlContextClick(event: MouseEvent, isMacPlatform: boolean): boolean {
  return isMacPlatform && event.button === 0 && event.ctrlKey && !event.metaKey;
}

export function applyCursorToGraphSurface(container: HTMLDivElement, cursor: GraphCursorStyle): void {
  container.style.cursor = cursor;

  for (const child of Array.from(container.children)) {
    if (child instanceof HTMLElement) {
      child.style.cursor = cursor;
    }
  }

  for (const canvas of Array.from(container.querySelectorAll('canvas'))) {
    canvas.style.cursor = cursor;
  }
}
