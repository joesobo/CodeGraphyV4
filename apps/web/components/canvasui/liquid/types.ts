import type { CSSProperties, ReactNode, RefObject } from 'react';

export interface LiquidOptions {
  /** Resolution of the simulation grid. */
  simResolution?: number;
  /** Resolution of the fluid trail texture. */
  dyeResolution?: number;
  /** How much the trail persists each frame (closer to 1 lasts longer). */
  densityDissipation?: number;
  /** How much motion persists each frame (closer to 1 lasts longer). */
  velocityDissipation?: number;
  /** How much pressure carries over between frames. */
  pressure?: number;
  /** Pressure solver iterations. */
  pressureIterations?: number;
  /** Rotational force added back into the flow. */
  curl?: number;
  /** Radius of the pointer splat. */
  radius?: number;
  /** Force multiplier applied on pointer movement. */
  force?: number;
  /** Strength of the color tint left by the flow. */
  intensity?: number;
  /** How strongly the flow warps the content. */
  distortion?: number;
  /** How much of the fluid color blends over the content. */
  blend?: number;
  /** Trail color as [r, g, b] in 0-1 range. Ignored when rainbow is on. */
  color?: [number, number, number];
  /** Color the trail from the flow direction instead of a fixed color. */
  rainbow?: boolean;
}

export interface LiquidElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Optional element that supplies pointer movement to the simulation. */
  interactionTarget?: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface LiquidInstance {
  /** Inject a splat at (x, y) in [0,1] space with velocity (dx, dy). */
  splat: (x: number, y: number, dx: number, dy: number) => void;
  /** Update simulation options live. Resolution changes are ignored. */
  setOptions: (options: LiquidOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

export interface LiquidProps extends LiquidOptions {
  children: ReactNode;
  className?: string;
  interactionTargetRef?: RefObject<HTMLElement | null>;
  style?: CSSProperties;
}
