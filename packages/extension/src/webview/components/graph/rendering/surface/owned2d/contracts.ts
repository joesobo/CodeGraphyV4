import type { MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { DirectionMode, NodeShape2D } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphSurfaceSharedProps } from '../sharedProps';

export interface OwnedGraphNodeStyle {
  borderColor: string;
  cornerRadius: number;
  borderWidth: number;
  fillColor: string;
  fillOpacity: number;
  height: number;
  opacity: number;
  shape: NodeShape2D;
  width: number;
}

export interface OwnedGraph2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  d3ReheatSimulation(): void;
  getFps(): number | null;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  pauseAnimation(): void;
  refresh(): void;
  resumeAnimation(): void;
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  updateNode(nodeId: string, updates: Record<string, unknown>): boolean;
  zoom(): number;
  zoom(scale: number, durationMs?: number): unknown;
  zoomToFit(durationMs?: number, padding?: number): void;
}

export interface Surface2dProps {
  backgroundColor: string;
  directionMode: DirectionMode;
  fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
  graphViewContributions?: CoreGraphViewContributionSet;
  getArrowColor: (this: void, link: FGLink) => string;
  getArrowRelPos: (this: void, link: FGLink) => number;
  getLinkColor: (this: void, link: FGLink) => string;
  getLinkParticles: (this: void, link: FGLink) => number;
  getLinkWidth: (this: void, link: FGLink) => number;
  getNodeStyle?: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getParticleColor: (this: void, link: FGLink) => string;
  linkCanvasObject: (this: void, link: FGLink, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodeLabelCanvasObject?: (this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: FGNode, color: string, context: CanvasRenderingContext2D) => void;
  onRenderFramePost: (this: void, context: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  physicsPaused?: boolean;
  showFps?: boolean;
  physicsSettings?: IPhysicsSettings;
  sharedProps: GraphSurfaceSharedProps;
}
