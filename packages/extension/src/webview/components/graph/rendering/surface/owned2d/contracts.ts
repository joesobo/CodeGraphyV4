import type { MutableRefObject } from 'react';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphSurfaceSharedProps } from '../sharedProps';

export interface OwnedGraph2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  d3ReheatSimulation(): void;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  pauseAnimation(): void;
  refresh(): void;
  resumeAnimation(): void;
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  zoom(): number;
  zoom(scale: number, durationMs?: number): unknown;
  zoomToFit(durationMs?: number, padding?: number): void;
}

export interface Surface2dProps {
  backgroundColor: string;
  directionMode: DirectionMode;
  fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
  getArrowColor: (this: void, link: FGLink) => string;
  getArrowRelPos: (this: void, link: FGLink) => number;
  getLinkColor: (this: void, link: FGLink) => string;
  getLinkParticles: (this: void, link: FGLink) => number;
  getLinkWidth: (this: void, link: FGLink) => number;
  getParticleColor: (this: void, link: FGLink) => string;
  linkCanvasObject: (this: void, link: FGLink, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: FGNode, color: string, context: CanvasRenderingContext2D) => void;
  onRenderFramePost: (this: void, context: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  physicsPaused?: boolean;
  physicsSettings?: IPhysicsSettings;
  sharedProps: GraphSurfaceSharedProps;
}
