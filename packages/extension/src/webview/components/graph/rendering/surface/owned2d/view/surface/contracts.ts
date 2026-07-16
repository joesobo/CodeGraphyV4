import type { MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';
import type { DirectionMode, NodeShape2D } from '../../../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../../../model/build';
import type { GraphSurfaceSharedProps } from '../../../sharedProps';

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
  reheatSimulation(): void;
  getFps(): number | null;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  resumeAnimation(): void;
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  updateNode(nodeId: string, updates: Record<string, unknown>): boolean;
  zoom(): number;
  zoom(scale: number, durationMs?: number): void;
  zoomBy(factor: number, durationMs?: number): void;
  zoomToFit(durationMs?: number, padding?: number): void;
}

export interface Surface2dProps {
  backgroundColor: string;
  directionMode: DirectionMode;
  fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
  graphViewContributions?: CoreGraphViewContributionSet;
  getArrowColor: (this: void, link: FGLink) => string;
  getLinkColor: (this: void, link: FGLink) => string;
  getLinkOpacity: (this: void, link: FGLink) => number;
  getLinkParticles: (this: void, link: FGLink) => number;
  getLinkWidth: (this: void, link: FGLink) => number;
  getNodeStyle: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getParticleColor: (this: void, link: FGLink) => string;
  getStyleRevision(this: void): number;
  nodeLabelCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  onRenderFramePost: (this: void, context: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  showFps: boolean;
  showMinimap: boolean;
  physicsSettings: IPhysicsSettings;
  sharedProps: GraphSurfaceSharedProps;
}
