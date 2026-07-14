import type { MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { DirectionMode, NodeShape2D } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphSurfaceSharedProps } from '../sharedProps';
import type { OwnedGraphStageAttributionRecording } from './performance/attribution';
import type { OwnedGraphPerformanceSample } from './performance/model';
import type {
  OwnedGraphInteractionRecording,
  OwnedGraphInteractionRecordingOptions,
} from './performance/recording';

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
  getPerformance(): OwnedGraphPerformanceSample;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  pauseAnimation(): void;
  refresh(): void;
  resumeAnimation(): void;
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  startInteractionRecording(options: OwnedGraphInteractionRecordingOptions): void;
  startStageAttributionRecording(): void;
  stopInteractionRecording(): OwnedGraphInteractionRecording | null;
  stopStageAttributionRecording(): Readonly<OwnedGraphStageAttributionRecording> | null;
  updateNode(nodeId: string, updates: Record<string, unknown>): boolean;
  zoom(): number;
  zoom(scale: number, durationMs?: number): unknown;
  zoomBy(factor: number, durationMs?: number): unknown;
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
  getNodeStyle?: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getParticleColor: (this: void, link: FGLink) => string;
  getStyleRevision?: (this: void) => number;
  nodeLabelCanvasObject?: (this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number) => void;
  onRenderFramePost: (this: void, context: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  showFps?: boolean;
  physicsSettings?: IPhysicsSettings;
  sharedProps: GraphSurfaceSharedProps;
}
