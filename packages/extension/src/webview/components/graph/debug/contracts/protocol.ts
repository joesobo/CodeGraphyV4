import type { OwnedGraph2dControls } from '../../rendering/surface/owned2d/contracts';
import type { OwnedGraphStageAttributionRecording } from '../../rendering/surface/owned2d/performance/attribution';
import type { OwnedGraphPerformanceSample } from '../../rendering/surface/owned2d/performance/model';
import type {
  OwnedGraphInteractionRecording,
  OwnedGraphInteractionRecordingOptions,
} from '../../rendering/surface/owned2d/performance/recording';

export interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  fps: number | null;
  nodes: Array<{
    baseOpacity?: number;
    collisionRadius: number;
    color?: string;
    id: string;
    imageUrl?: string;
    positionFinite: boolean;
    screenX: number;
    shapeSize2D?: {
      height: number;
      width: number;
    };
    screenY: number;
    size: number;
    x: number;
    y: number;
  }>;
  zoom: number | null;
}

export type GraphDebugControls = Partial<Pick<
  OwnedGraph2dControls,
  | 'centerAt'
  | 'getFps'
  | 'getPerformance'
  | 'graph2ScreenCoords'
  | 'startInteractionRecording'
  | 'startStageAttributionRecording'
  | 'stopInteractionRecording'
  | 'stopStageAttributionRecording'
  | 'zoom'
  | 'zoomToFit'
>>;

export interface GraphDebugApi {
  centerNode(this: void, nodeId: string, scale: number): boolean;
  fitView(this: void): void;
  fitViewWithPadding(this: void, padding: number): void;
  getNodeScreenPosition(this: void, nodeId: string): { x: number; y: number } | null;
  getPerformance(this: void): OwnedGraphPerformanceSample;
  getSnapshot(this: void): GraphDebugSnapshot;
  openNodeContextMenu(this: void, nodeId: string): void;
  startInteractionRecording(this: void, options: OwnedGraphInteractionRecordingOptions): void;
  startStageAttributionRecording(this: void): void;
  stopInteractionRecording(this: void): OwnedGraphInteractionRecording | null;
  stopStageAttributionRecording(this: void): Readonly<OwnedGraphStageAttributionRecording> | null;
}
