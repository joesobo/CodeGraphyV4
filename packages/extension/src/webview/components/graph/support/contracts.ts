import type { ForceGraphMethods as FG2DMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import SpriteText from 'three-spritetext';

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

export type StrengthForce = { strength: (value: number) => unknown };
export type LinkDistanceForce = { distance: (value: number) => unknown; strength: (value: number) => unknown };

export function as2DExtMethods<NodeT extends NodeObject, LinkT extends LinkObject>(
  instance: FG2DMethods<NodeT, LinkT> | undefined
): FG2DExtMethods<NodeT, LinkT> | undefined {
  return instance as FG2DExtMethods<NodeT, LinkT> | undefined;
}

export function setSpriteVisible(
  sprite: SpriteText | { visible?: boolean },
  visible: boolean,
): void {
  (sprite as unknown as { visible: boolean }).visible = visible;
}
